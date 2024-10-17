import type { ChainKey, RoutesRequest } from '@lifi/sdk'
import { getRoutes, LiFiErrorCode, SDKError } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import {
  bn,
  bnOrZero,
  convertBasisPointsToDecimalPercentage,
  convertPrecision,
  isFulfilled,
  isRejected,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  MultiHopTradeQuoteSteps,
  SingleHopTradeQuoteSteps,
  SwapperDeps,
  SwapSource,
} from '../../../types'
import {
  type GetEvmTradeQuoteInput,
  type SwapErrorRight,
  SwapperName,
  TradeQuoteError,
} from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { configureLiFi } from '../utils/configureLiFi'
import { LIFI_INTEGRATOR_ID } from '../utils/constants'
import { getIntermediaryTransactionOutputs } from '../utils/getIntermediaryTransactionOutputs/getIntermediaryTransactionOutputs'
import { getLifiEvmAssetAddress } from '../utils/getLifiEvmAssetAddress/getLifiEvmAssetAddress'
import { getNetworkFeeCryptoBaseUnit } from '../utils/getNetworkFeeCryptoBaseUnit/getNetworkFeeCryptoBaseUnit'
import { lifiTokenToAsset } from '../utils/lifiTokenToAsset/lifiTokenToAsset'
import { transformLifiStepFeeData } from '../utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTradeQuote } from '../utils/types'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  deps: SwapperDeps,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<Result<LifiTradeQuote[], SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
    receiveAddress,
    accountNumber,
    supportsEIP1559,
    affiliateBps,
    potentialAffiliateBps,
    isConnected,
  } = input

  // TODO(gomes): when we actually split between TradeQuote and TradeRate in https://github.com/shapeshift/web/issues/7941,
  // this won't be an issue anymore
  if (isConnected && !(receiveAddress && sendAddress))
    return Err(
      makeSwapErrorRight({
        message: 'missing address',
        code: TradeQuoteError.InternalError,
      }),
    )

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.LIFI)

  const sellLifiChainKey = lifiChainMap.get(sellAsset.chainId)
  const buyLifiChainKey = lifiChainMap.get(buyAsset.chainId)

  if (sellLifiChainKey === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }
  if (buyLifiChainKey === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  configureLiFi()

  const affiliateBpsDecimalPercentage = convertBasisPointsToDecimalPercentage(affiliateBps)
  const routesRequest: RoutesRequest = {
    fromChainId: Number(fromChainId(sellAsset.chainId).chainReference),
    toChainId: Number(fromChainId(buyAsset.chainId).chainReference),
    fromTokenAddress: getLifiEvmAssetAddress(sellAsset),
    toTokenAddress: getLifiEvmAssetAddress(buyAsset),
    fromAddress: sendAddress,
    toAddress: receiveAddress,
    fromAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    options: {
      // used for analytics and affiliate fee - do not change this without considering impact
      integrator: LIFI_INTEGRATOR_ID,
      slippage: Number(slippageTolerancePercentageDecimal),
      bridges: { deny: ['stargate', 'stargateV2', 'amarok', 'arbitrum'] },
      allowSwitchChain: true,
      fee: affiliateBpsDecimalPercentage.isZero()
        ? undefined
        : affiliateBpsDecimalPercentage.toNumber(),
    },
  }

  // getMixPanel()?.track(MixPanelEvent.SwapperApiRequest, {
  //   swapper: SwapperName.LIFI,
  //   method: 'get',
  //   // Note, this may change if the Li.Fi SDK changes
  //   url: 'https://li.quest/v1/advanced/routes',
  // })
  const routesResponse = await getRoutes(routesRequest)
    .then(response => Ok(response))
    .catch((e: SDKError) => {
      const code = (() => {
        switch (e.code) {
          case LiFiErrorCode.ValidationError:
            // our input was incorrect - the error is internal to us
            return TradeQuoteError.InternalError
          case LiFiErrorCode.InternalError:
          case LiFiErrorCode.Timeout:
          default:
            return TradeQuoteError.QueryFailed
        }
      })()
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code,
        }),
      )
    })

  if (routesResponse.isErr()) return Err(routesResponse.unwrapErr())

  const { routes } = routesResponse.unwrap()

  if (routes.length === 0) {
    return Err(
      makeSwapErrorRight({
        message: 'no route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const promises = await Promise.allSettled(
    routes.slice(0, 3).map(async selectedLifiRoute => {
      // this corresponds to a "hop", so we could map the below code over selectedLifiRoute.steps to
      // generate a multi-hop quote
      const steps = (await Promise.all(
        selectedLifiRoute.steps.map(async lifiStep => {
          const stepSellAsset = lifiTokenToAsset(lifiStep.action.fromToken, deps.assetsById)
          const stepChainId = stepSellAsset.chainId
          const stepBuyAsset = lifiTokenToAsset(lifiStep.action.toToken, deps.assetsById)

          // for the rate to be valid, both amounts must be converted to the same precision
          const estimateRate = convertPrecision({
            value: lifiStep.estimate.toAmount,
            inputExponent: stepBuyAsset.precision,
            outputExponent: stepSellAsset.precision,
          })
            .dividedBy(bn(lifiStep.estimate.fromAmount))
            .toFixed()

          const protocolFees = transformLifiStepFeeData({
            chainId: stepChainId,
            lifiStep,
            assets: deps.assetsById,
          })

          const sellAssetProtocolFee = protocolFees[stepSellAsset.assetId]
          const buyAssetProtocolFee = protocolFees[stepBuyAsset.assetId]
          const sellSideProtocolFeeCryptoBaseUnit = bnOrZero(
            sellAssetProtocolFee?.amountCryptoBaseUnit,
          )
          const sellSideProtocolFeeBuyAssetBaseUnit = bnOrZero(
            convertPrecision({
              value: sellSideProtocolFeeCryptoBaseUnit,
              inputExponent: stepSellAsset.precision,
              outputExponent: stepBuyAsset.precision,
            }),
          ).times(estimateRate)
          const buySideProtocolFeeCryptoBaseUnit = bnOrZero(
            buyAssetProtocolFee?.amountCryptoBaseUnit,
          )

          const buyAmountAfterFeesCryptoBaseUnit = bnOrZero(
            lifiStep.estimate.toAmount,
          ).toPrecision()

          const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(buyAmountAfterFeesCryptoBaseUnit)
            .plus(sellSideProtocolFeeBuyAssetBaseUnit)
            .plus(buySideProtocolFeeCryptoBaseUnit)
            .toFixed(0)

          const sellAmountIncludingProtocolFeesCryptoBaseUnit = lifiStep.action.fromAmount

          const intermediaryTransactionOutputs = getIntermediaryTransactionOutputs(
            deps.assetsById,
            lifiStep,
          )

          const networkFeeCryptoBaseUnit = await getNetworkFeeCryptoBaseUnit({
            chainId: stepChainId,
            lifiStep,
            supportsEIP1559: Boolean(supportsEIP1559),
            deps,
          })

          const source: SwapSource = `${SwapperName.LIFI} • ${lifiStep.toolDetails.name}`

          return {
            allowanceContract: lifiStep.estimate.approvalAddress,
            accountNumber,
            buyAmountBeforeFeesCryptoBaseUnit,
            buyAmountAfterFeesCryptoBaseUnit,
            buyAsset: stepBuyAsset,
            intermediaryTransactionOutputs,
            feeData: {
              protocolFees,
              networkFeeCryptoBaseUnit,
            },
            rate: estimateRate,
            sellAmountIncludingProtocolFeesCryptoBaseUnit,
            sellAsset: stepSellAsset,
            source,
            estimatedExecutionTimeMs: 1000 * lifiStep.estimate.executionDuration,
          }
        }),
      )) as SingleHopTradeQuoteSteps | MultiHopTradeQuoteSteps

      // The rate for the entire multi-hop swap
      const netRate = convertPrecision({
        value: selectedLifiRoute.toAmountMin,
        inputExponent: buyAsset.precision,
        outputExponent: sellAsset.precision,
      })
        .dividedBy(bn(selectedLifiRoute.fromAmount))
        .toString()

      return {
        id: selectedLifiRoute.id,
        receiveAddress,
        affiliateBps,
        potentialAffiliateBps,
        steps,
        rate: netRate,
        selectedLifiRoute,
        slippageTolerancePercentageDecimal,
      }
    }),
  )

  if (promises.every(isRejected)) {
    for (const promise of promises) {
      if (promise.reason instanceof SDKError) {
        if (promise.reason.stack?.includes('Request failed with status code 429')) {
          return Err(
            makeSwapErrorRight({
              message: `[LiFi: tradeQuote] - ${promise.reason.message}`,
              code: TradeQuoteError.RateLimitExceeded,
            }),
          )
        }

        return Err(
          makeSwapErrorRight({
            message: `[LiFi: tradeQuote] - ${promise.reason.message}`,
            code: TradeQuoteError.QueryFailed,
          }),
        )
      }
    }

    return Err(
      makeSwapErrorRight({
        message: '[LiFi: tradeQuote] - failed to get fee data',
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }

  return Ok(promises.filter(isFulfilled).map(({ value }) => value))
}
