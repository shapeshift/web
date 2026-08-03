import {
  BigAmount,
  chainIdToFeeAssetId,
  convertDecimalPercentageToBasisPoints,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import type {
  ButterSwapTradeQuoteInput,
  ButterSwapTradeRateInput,
  RouteSuccessItem,
} from '../types'
import {
  ButterSwapErrorCode,
  butterSwapErrorToTradeQuoteError,
  getButterRoute,
  isRouteSuccess,
} from '../xhr'
import { makeButterSwapAffiliate } from './constants'
import type { GetButterSwapStepDataArgs } from './getButterSwapStepData'
import { assertValidTrade } from './helpers'

type ButterSwapTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  route: RouteSuccessItem
  stepDataArgs: Omit<GetButterSwapStepDataArgs, 'type' | 'input' | 'from' | 'buildTx'>
}

export const getButterSwapTradeContext = async ({
  input,
  deps,
  slippageTolerancePercentageDecimal,
}: {
  input: ButterSwapTradeQuoteInput | ButterSwapTradeRateInput
  deps: SwapperDeps
  slippageTolerancePercentageDecimal: string
}): Promise<Result<ButterSwapTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const assertion = assertValidTrade({ sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippage = convertDecimalPercentageToBasisPoints(
    slippageTolerancePercentageDecimal,
  ).toString()

  const routeResult = await getButterRoute({
    sellAsset,
    buyAsset,
    sellAmountCryptoPrecision: BigAmount.fromBaseUnit({
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      precision: sellAsset.precision,
    }).toPrecision(),
    slippage,
    affiliate: makeButterSwapAffiliate(affiliateBps),
  })

  if (routeResult.isErr()) return Err(routeResult.unwrapErr())
  const routeResponse = routeResult.unwrap()

  if (!isRouteSuccess(routeResponse)) {
    if (routeResponse.errno === ButterSwapErrorCode.InsufficientAmount) {
      const minAmountCryptoBaseUnit = BigAmount.fromPrecision({
        value: (routeResponse as any).minAmount,
        precision: sellAsset.precision,
      }).toBaseUnit()

      return Err(
        createTradeAmountTooSmallErr({ minAmountCryptoBaseUnit, assetId: sellAsset.assetId }),
      )
    }

    return Err(
      makeSwapErrorRight({
        message: `[getButterSwapTradeContext] ${routeResponse.message}`,
        code: butterSwapErrorToTradeQuoteError(routeResponse.errno),
      }),
    )
  }

  const route = routeResponse.data[0]
  if (!route) {
    return Err(
      makeSwapErrorRight({
        message: '[getButterSwapTradeContext] No route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const feeAsset = deps.assetsById[chainIdToFeeAssetId(sellAsset.chainId)]
  if (!feeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getButterSwapTradeContext] Fee asset not found for chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Destination receive amount takes priority; same-chain swaps only carry a source chain amount
  const outputAmount = route.dstChain?.totalAmountOut ?? route.srcChain.totalAmountOut

  const buyAmountAfterFeesCryptoBaseUnit = BigAmount.fromPrecision({
    value: outputAmount,
    precision: buyAsset.precision,
  }).toBaseUnit()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  return Ok({
    tradeCommon: {
      id: route.hash,
      rate,
      swapperName: SwapperName.ButterSwap,
      affiliateBps,
      isStreaming: false,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      rate,
      buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      source: SwapperName.ButterSwap,
      buyAsset,
      sellAsset,
      allowanceContract: route.contract ?? '',
      estimatedExecutionTimeMs: route.timeEstimated * 1000,
      affiliateFee: buildAffiliateFee({
        strategy: 'buy_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        isEstimate: true,
      }),
    },
    protocolFees: undefined,
    route,
    stepDataArgs: {
      route,
      feeAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      spenderAddress: route.contract ?? '',
      deps,
    },
  })
}
