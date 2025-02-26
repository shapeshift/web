import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import {
  BigNumber,
  bn,
  bnOrZero,
  convertBasisPointsToDecimalPercentage,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../..'
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
import { fetchPortalsTradeOrder, PortalsError } from '../utils/fetchPortalsTradeOrder'
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
    ? bnOrZero(input.slippageTolerancePercentageDecimal).times(100).toNumber()
    : bnOrZero(getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Portals))
        .times(100)
        .toNumber()

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

  try {
    const maybePortalsTradeOrderResponse = await fetchPortalsTradeOrder({
      sender: sendAddress,
      inputToken,
      outputToken,
      inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentage: userSlippageTolerancePercentageDecimalOrDefault,
      partner: getTreasuryAddressFromChainId(sellAsset.chainId),
      feePercentage: affiliateBpsPercentage,
      validate: true,
      swapperConfig,
    })
      .then(res => Ok(res))
      .catch(async err => {
        if (err instanceof PortalsError) {
          // We assume a PortalsError was thrown because the slippage tolerance was too high during simulation
          // So we attempt another (failing) call with autoslippage which will give us the actual expected slippage
          const portalsExpectedSlippage = await fetchPortalsTradeOrder({
            sender: sendAddress,
            inputToken,
            outputToken,
            inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
            autoSlippage: true,
            partner: getTreasuryAddressFromChainId(sellAsset.chainId),
            feePercentage: affiliateBpsPercentage,
            validate: true,
            swapperConfig,
          })
            // This should never happen but could in very rare cases if original call failed on slippage slightly over 2.5% but this one succeeds on slightly under 2.5%
            .then(res => res.context.slippageTolerancePercentage)
            .catch(err => (err as PortalsError).message.match(/Expected slippage is (.*?)%/)?.[1])

          // This should never happen as we don't have auto-slippage on for `/portal` as of now (2024-12-06, see https://github.com/shapeshift/web/pull/8293)
          // But as soon as Portals implement auto-slippage for the estimate endpoint, we will most likely re-enable it, assuming it actually works
          if (err.message.includes('Auto slippage exceeds'))
            return Err(
              makeSwapErrorRight({
                message: err.message,
                details: {
                  expectedSlippage: portalsExpectedSlippage
                    ? bn(portalsExpectedSlippage).toFixed(2, BigNumber.ROUND_HALF_UP)
                    : undefined,
                },
                cause: err,
                code: TradeQuoteError.FinalQuoteMaxSlippageExceeded,
              }),
            )
          if (err.message.includes('execution reverted'))
            return Err(
              makeSwapErrorRight({
                message: err.message,
                details: {
                  expectedSlippage: portalsExpectedSlippage
                    ? bn(portalsExpectedSlippage).toFixed(2, BigNumber.ROUND_HALF_UP)
                    : undefined,
                },
                cause: err,
                code: TradeQuoteError.FinalQuoteExecutionReverted,
              }),
            )
        }
        return Err(
          makeSwapErrorRight({
            message: 'failed to get Portals quote',
            cause: err,
            code: TradeQuoteError.NetworkFeeEstimationFailed,
          }),
        )
      })

    if (maybePortalsTradeOrderResponse.isErr())
      return Err(maybePortalsTradeOrderResponse.unwrapErr())

    const portalsTradeOrderResponse = maybePortalsTradeOrderResponse.unwrap()

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

    const protocolFeeAsset = feeToken === inputToken ? sellAsset : buyAsset

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
      quoteOrRate: 'quote' as const,
      receiveAddress: input.receiveAddress,
      affiliateBps,
      potentialAffiliateBps,
      rate: inputOutputRate,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Portals,
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
              [protocolFeeAsset.assetId]: {
                amountCryptoBaseUnit: feeAmount,
                asset: protocolFeeAsset,
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
