import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn, bnOrZero, convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../..'
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
import { fetchPortalsTradeEstimate, fetchPortalsTradeOrder } from '../utils/fetchPortalsTradeOrder'
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
    hasWallet,
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

  if (hasWallet && !sendAddress) return Err(makeSwapErrorRight({ message: 'missing sendAddress' }))

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

    if (!hasWallet) {
      // Use the quote estimate endpoint to get a quote without a wallet
      const quoteEstimateResponse = await fetchPortalsTradeEstimate({
        sender: sendAddress,
        inputToken,
        outputToken,
        inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        slippageTolerancePercentage: userSlippageTolerancePercentageDecimalOrDefault
          ? userSlippageTolerancePercentageDecimalOrDefault * 100
          : undefined,
        swapperConfig,
        hasWallet,
      })

      const rate = getRate({
        sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit: quoteEstimateResponse?.context.outputAmount,
        sellAsset,
        buyAsset,
      })

      const tradeQuote = {
        id: uuid(),
        receiveAddress: input.receiveAddress,
        affiliateBps,
        potentialAffiliateBps,
        rate,
        slippageTolerancePercentageDecimal: quoteEstimateResponse?.context
          .slippageTolerancePercentage
          ? bn(quoteEstimateResponse?.context.slippageTolerancePercentage)
              .div(100)
              .toString()
          : undefined,
        steps: [
          {
            estimatedExecutionTimeMs: undefined, // Portals doesn't provide this info
            allowanceContract: undefined,
            accountNumber,
            rate,
            buyAsset,
            sellAsset,
            buyAmountBeforeFeesCryptoBaseUnit: quoteEstimateResponse.minOutputAmount,
            buyAmountAfterFeesCryptoBaseUnit: quoteEstimateResponse.outputAmount,
            sellAmountIncludingProtocolFeesCryptoBaseUnit:
              input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
            feeData: {
              networkFeeCryptoBaseUnit: undefined,
              // Protocol fees are always denominated in sell asset here
              protocolFees: {},
            },
            source: SwapperName.Portals,
          },
        ] as unknown as SingleHopTradeQuoteSteps,
      }

      return Ok(tradeQuote)
    }

    // Attempt fetching a quote with validation enabled to leverage upstream gasLimit estimate
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
      hasWallet,
    }).catch(async e => {
      // If validation fails, fire 3 more quotes:
      // 1. a quote estimate (does not require approval) to get the optimal slippage tolerance
      // 2. a quote with validation enabled, but using a well-funded address to get a rough gasLimit estimate
      // 3. another quote with validation disabled, to get an actual quote (using the user slippage, or the optimal from the estimate)
      console.info('failed to get Portals quote with validation enabled', e)

      // Use the quote estimate endpoint to get the optimal slippage tolerance
      const quoteEstimateResponse = await fetchPortalsTradeEstimate({
        sender: sendAddress,
        inputToken,
        outputToken,
        inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        swapperConfig,
        hasWallet,
      }).catch(e => {
        console.info('failed to get Portals quote estimate', e)
        return undefined
      })

      const dummyQuoteParams = getDummyQuoteParams(sellAsset.chainId)

      const dummySellAssetAddress = fromAssetId(dummyQuoteParams.sellAssetId).assetReference
      const dummyBuyAssetAddress = fromAssetId(dummyQuoteParams.buyAssetId).assetReference

      const dummyInputToken = `${portalsNetwork}:${dummySellAssetAddress}`
      const dummyOutputToken = `${portalsNetwork}:${dummyBuyAssetAddress}`

      // Use a dummy request to the portal endpoint to get a rough gasLimit estimate
      const dummyOrderResponse = await fetchPortalsTradeOrder({
        sender: dummyQuoteParams.accountAddress,
        inputToken: dummyInputToken,
        outputToken: dummyOutputToken,
        inputAmount: dummyQuoteParams.sellAmountCryptoBaseUnit,
        slippageTolerancePercentage: userSlippageTolerancePercentageDecimalOrDefault,
        partner: getTreasuryAddressFromChainId(sellAsset.chainId),
        feePercentage: affiliateBpsPercentage,
        hasWallet,
        validate: true,
        swapperConfig,
      })
        .then(({ context }) => ({
          maybeGasLimit: context.gasLimit,
        }))
        .catch(e => {
          console.info('failed to get Portals quote with validation enabled using dummy address', e)
          return undefined
        })
      const userSlippageToleranceDecimalOrDefault = userSlippageTolerancePercentageDecimalOrDefault
        ? userSlippageTolerancePercentageDecimalOrDefault * 100
        : undefined

      const order = await fetchPortalsTradeOrder({
        sender: sendAddress,
        inputToken,
        outputToken,
        inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        slippageTolerancePercentage:
          userSlippageToleranceDecimalOrDefault ??
          quoteEstimateResponse?.context.slippageTolerancePercentage ??
          bnOrZero(getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Portals))
            .times(100)
            .toNumber(),
        partner: getTreasuryAddressFromChainId(sellAsset.chainId),
        feePercentage: affiliateBpsPercentage,
        validate: false,
        hasWallet,
        swapperConfig,
      })

      if (dummyOrderResponse?.maybeGasLimit)
        order.context.gasLimit = dummyOrderResponse.maybeGasLimit
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
      rate,
      slippageTolerancePercentageDecimal,
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
            // Protocol fees are always denominated in sell asset here
            protocolFees: {
              [sellAsset.assetId]: {
                amountCryptoBaseUnit: feeAmount,
                asset: sellAsset,
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
