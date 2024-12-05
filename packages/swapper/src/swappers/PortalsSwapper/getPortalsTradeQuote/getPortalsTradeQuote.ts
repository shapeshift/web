import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero, convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import type {
  GetEvmTradeQuoteInputBase,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperConfig,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../utils/helpers/helpers'
import { chainIdToPortalsNetwork } from '../constants'
import { fetchPortalsTradeOrder } from '../utils/fetchPortalsTradeOrder'
import { isSupportedChainId } from '../utils/helpers'

export async function getPortalsTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  swapperConfig: SwapperConfig,
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

  const userSlippageTolerancePercentageDecimalOrDefault = input.slippageTolerancePercentageDecimal
    ? Number(input.slippageTolerancePercentageDecimal)
    : undefined // Use auto slippage if no user preference is provided

  if (!sendAddress) return Err(makeSwapErrorRight({ message: 'missing sendAddress' }))

  try {
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
      slippageTolerancePercentage: userSlippageTolerancePercentageDecimalOrDefault
        ? userSlippageTolerancePercentageDecimalOrDefault * 100
        : undefined,
      partner: getTreasuryAddressFromChainId(sellAsset.chainId),
      feePercentage: affiliateBpsPercentage,
      validate: true,
      swapperConfig,
    })

    const {
      context: {
        orderId,
        outputAmount: buyAmountAfterFeesCryptoBaseUnit,
        minOutputAmount: buyAmountBeforeFeesCryptoBaseUnit,
        slippageTolerancePercentage,
        target: allowanceContract,
        feeAmount,
        gasLimit,
        feeToken,
      },
      tx,
    } = portalsTradeOrderResponse

    const feeAsset = feeToken === inputToken ? sellAsset : buyAsset

    if (!tx) throw new Error('Portals Tx simulation failed upstream')

    const inputOutputRate = getInputOutputRate({
      sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      // times 1 isn't a mistake, it's just so we can write this comment above to mention that Portals already add a
      // buffer of ~15% to the gas limit
      gasLimit: bnOrZero(gasLimit).times(1).toFixed(),
    })

    const slippageTolerancePercentageDecimal = bnOrZero(slippageTolerancePercentage)
      .div(100)
      .toString()

    const tradeQuote: TradeQuote = {
      id: orderId,
      receiveAddress: input.receiveAddress,
      affiliateBps,
      potentialAffiliateBps,
      rate: inputOutputRate,
      slippageTolerancePercentageDecimal,
      steps: [
        {
          accountNumber,
          allowanceContract,
          rate: inputOutputRate,
          buyAsset,
          sellAsset,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit:
            input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: {
              [feeAsset.assetId]: {
                amountCryptoBaseUnit: feeAmount,
                asset: feeAsset,
                requiresBalance: false,
              },
            },
          },
          source: SwapperName.Portals,
          estimatedExecutionTimeMs: undefined, // Portals doesn't provide this info
          portalsTransactionMetadata: tx,
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
