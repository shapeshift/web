import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero, convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import { calcNetworkFeeCryptoBaseUnit } from '@shapeshiftoss/utils/dist/evm'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { SwapperConfig } from '../../../types'
import {
  type GetEvmTradeQuoteInput,
  type SingleHopTradeQuoteSteps,
  type SwapErrorRight,
  SwapperName,
  type TradeQuote,
  TradeQuoteError,
} from '../../../types'
import { getRate, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../utils/helpers/helpers'
import { chainIdToPortalsNetwork } from '../constants'
import { fetchPortalsTradeOrder } from '../utils/fetchPortalsTradeOrder'
import { getDummyQuoteParams, isSupportedChainId } from '../utils/helpers'

export async function getPortalsTradeQuote(
  input: GetEvmTradeQuoteInput,
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

    // Attempt fetching a quote with validation enabled to leverage upstream gasLimit estimate
    const portalsTradeOrderResponse = await fetchPortalsTradeOrder({
      sender: sendAddress,
      inputToken,
      outputToken,
      inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentage: Number(slippageTolerancePercentageDecimal) * 100,
      partner: getTreasuryAddressFromChainId(sellAsset.chainId),
      feePercentage: affiliateBpsPercentage,
      validate: true,
      swapperConfig,
    }).catch(async e => {
      // If validation fails, fire two more quotes:
      // 1. a quote with validation enabled, but using a well-funded address to get a rough gasLimit estimate
      // 2. another quote with validation disabled, to get an actual quote
      console.info('failed to get Portals quote with validation enabled', e)
      const dummyQuoteParams = getDummyQuoteParams(sellAsset.chainId)

      const dummySellAssetAddress = fromAssetId(dummyQuoteParams.sellAssetId).assetReference
      const dummyBuyAssetAddress = fromAssetId(dummyQuoteParams.buyAssetId).assetReference

      const dummyInputToken = `${portalsNetwork}:${dummySellAssetAddress}`
      const dummyOutputToken = `${portalsNetwork}:${dummyBuyAssetAddress}`

      const maybeGasLimit = await fetchPortalsTradeOrder({
        sender: dummyQuoteParams.accountAddress,
        inputToken: dummyInputToken,
        outputToken: dummyOutputToken,
        inputAmount: dummyQuoteParams.sellAmountCryptoBaseUnit,
        slippageTolerancePercentage: 10, // hardcoded high slippage tolerance for the dummy quote, the actual one will use the correct one
        partner: getTreasuryAddressFromChainId(sellAsset.chainId),
        feePercentage: affiliateBpsPercentage,
        validate: true,
        swapperConfig,
      })
        .then(({ context }) => context.gasLimit)
        .catch(e => {
          console.info('failed to get Portals quote with validation enabled using dummy address', e)
          return undefined
        })

      const order = await fetchPortalsTradeOrder({
        sender: sendAddress,
        inputToken,
        outputToken,
        inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        slippageTolerancePercentage: Number(slippageTolerancePercentageDecimal) * 100,
        partner: getTreasuryAddressFromChainId(sellAsset.chainId),
        feePercentage: affiliateBpsPercentage,
        validate: false,
        swapperConfig,
      })

      if (maybeGasLimit) order.context.gasLimit = maybeGasLimit
      return order
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
      },
    } = portalsTradeOrderResponse

    const rate = getRate({
      sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()

    const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      // times 1 isn't a mistake, it's just so we can write this comment above to mention that Portals already add a
      // buffer of ~15% to the gas limit
      gasLimit: bnOrZero(gasLimit).times(1).toFixed(),
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
            // Protocol fees are always denominated in buy asset here, this is the downside on the swap
            protocolFees: {
              [buyAsset.assetId]: {
                amountCryptoBaseUnit: feeAmount,
                asset: buyAsset,
                requiresBalance: false,
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
