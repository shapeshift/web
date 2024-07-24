import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn, convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import { getFees } from '@shapeshiftoss/utils/dist/evm'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import {
  type GetEvmTradeQuoteInput,
  type SingleHopTradeQuoteSteps,
  type SwapErrorRight,
  SwapperName,
  type TradeQuote,
  TradeQuoteError,
} from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../utils/helpers/helpers'
import { chainIdToPortalsNetwork } from '../constants'
import { fetchPortalsTradeOrder } from '../utils/fetchPortalsTradeOrder'
import { isSupportedChainId } from '../utils/helpers'

export async function getPortalsTradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sendAddress,
    accountNumber,
    affiliateBps,
    potentialAffiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  // Not a decimal percentage, just a good ol' percentage e.g 1 for 1%
  const affiliateBpsPercentage = convertBasisPointsToDecimalPercentage(affiliateBps)
    .times(100)
    .toNumber()

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Portals)

  try {
    if (!sendAddress) return Err(makeSwapErrorRight({ message: 'missing sendAddress' }))

    const portalsNetwork = chainIdToPortalsNetwork[chainId as KnownChainIds]

    if (!portalsNetwork) {
      return Err(
        makeSwapErrorRight({
          message: `unsupported ChainId`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: input.chainId },
        }),
      )
    }

    const sellAssetAddress = isNativeEvmAsset(sellAsset.assetId)
      ? zeroAddress
      : fromAssetId(sellAsset.assetId).assetReference
    const buyAssetAddress = isNativeEvmAsset(buyAsset.assetId)
      ? zeroAddress
      : fromAssetId(buyAsset.assetId).assetReference

    const inputToken = `${portalsNetwork}:${sellAssetAddress}`
    const outputToken = `${portalsNetwork}:${buyAssetAddress}`

    const portalsTradeOrderResponse = await fetchPortalsTradeOrder({
      sender: sendAddress,
      inputToken,
      outputToken,
      inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentage: Number(slippageTolerancePercentageDecimal) * 100,
      partner: getTreasuryAddressFromChainId(sellAsset.chainId),
      feePercentage: affiliateBpsPercentage,
    })

    debugger

    const {
      tx,
      context: {
        orderId,
        outputAmount: buyAmountAfterFeesCryptoBaseUnit,
        minOutputAmount: buyAmountBeforeFeesCryptoBaseUnit,
        slippageTolerancePercentage,
        target: allowanceContract,
        // TODO(gomes): if we go with gasless transactions, consume me - this is the `feeAmount` in token for token sells, not in native asset
        // feeAmount,
      },
    } = portalsTradeOrderResponse

    const rate = bn(buyAmountAfterFeesCryptoBaseUnit)
      .div(input.sellAmountIncludingProtocolFeesCryptoBaseUnit)
      .toString()

    const adapter = assertGetEvmChainAdapter(chainId)

    const feeAssetId = adapter.getFeeAssetId()

    const networkFeeCryptoBaseUnit = await getFees({
      adapter,
      data: tx.data,
      to: tx.to,
      value: tx.value,
      from: tx.from,
      supportsEIP1559,
    })
      .then(({ networkFeeCryptoBaseUnit }) => networkFeeCryptoBaseUnit)
      // TODO(gomes): Portals aren't able to do a rough fees estimation yet like other swappers, so we 0 out fees if they fail (i.e approval required and can't simulate Tx)
      // The only fees they give us are the ones in token in case of a gasless Tx a la CoW
      // Solutions would be to either:
      // - Wait for Portals to implement a rough fees estimation for good ol' Txs
      // - Go gasless, and repeat the CoW signatures madness, which is probably the best solution, but much less of an easy feat
      .catch(e => {
        console.log('Error getting fees for Portals', e)
        return '0'
      })

    const tradeQuote: TradeQuote = {
      id: orderId,
      receiveAddress: input.receiveAddress,
      affiliateBps,
      potentialAffiliateBps,
      rate,
      slippageTolerancePercentageDecimal: (slippageTolerancePercentage / 100).toString(),
      steps: [
        {
          accountNumber,
          allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit:
            input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            // TODO(gomes): if we go with gasless transactions, the protocolFees will always be paid in the sell asset
            protocolFees: {
              [feeAssetId]: {
                amountCryptoBaseUnit: networkFeeCryptoBaseUnit,
                asset: input.sellAsset,
                requiresBalance: true,
              },
            },
          },
          source: SwapperName.Portals,
          estimatedExecutionTimeMs: undefined, // Portals doesn't provide this info
        },
      ] as SingleHopTradeQuoteSteps,
    }

    return Ok(tradeQuote)
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get Portals quote',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
