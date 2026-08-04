import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import {
  BigAmount,
  bn,
  bnOrZero,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
  isRejected,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../index'
import type {
  ProtocolFee,
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
  TradeCommon,
  TradeStepCommon,
} from '../../types'
import { SwapperName as SwapperNameEnum, TradeQuoteError } from '../../types'
import { getInputOutputRate, makeSwapErrorRight } from '..'
import { buildAffiliateFee } from '../affiliateFee'
import { getQuote } from './getQuote'
import type { GetThorStepDataArgs } from './getThorStepData'
import { getNativePrecision, getSwapSource } from './index'
import type {
  ThornodeQuoteResponseSuccess,
  ThorTradeQuoteInput,
  ThorTradeRateInput,
  ThorTradeRoute,
  TradeType,
} from './types'

export const getSuccessfulTrades = <T>(
  settled: PromiseSettledResult<Result<T, SwapErrorRight>>[],
): Result<T[], SwapErrorRight> => {
  const trades: T[] = []
  let firstError: SwapErrorRight | undefined

  for (const result of settled) {
    if (isRejected(result)) continue
    if (result.value.isOk()) trades.push(result.value.unwrap())
    else firstError ??= result.value.unwrapErr()
  }

  if (trades.length) return Ok(trades)

  return Err(
    firstError ??
      makeSwapErrorRight({
        message: 'Unable to create any routes',
        code: TradeQuoteError.UnsupportedTradePair,
        cause: settled.filter(isRejected).map(result => result.reason),
      }),
  )
}

export type ThorL1TradeContext = {
  route: ThorTradeRoute
  tradeCommon: TradeCommon & {
    isStreaming: boolean
    tradeType: TradeType
    expiry: number
    recommendedMinimumCryptoBaseUnit: string
  }
  stepCommon: Omit<TradeStepCommon, 'feeData' | 'allowanceContract'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetThorStepDataArgs, 'type' | 'input' | 'from' | 'memo'>
}

export const getThorL1TradeContexts = async (
  input: ThorTradeQuoteInput | ThorTradeRateInput,
  deps: SwapperDeps,
  streamingInterval: number,
  tradeType: TradeType,
  swapperName: SwapperName,
): Promise<Result<ThorL1TradeContext[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    affiliateBps: requestedAffiliateBps,
  } = input

  // "NativePrecision" is intended to indicate the base unit precision of the asset
  // for the corresponding swapper network (THORChain or MAYAChain)
  // (CACAO = 10, everything else = 8)
  const sellAssetNativePrecision = getNativePrecision(sellAsset.assetId, swapperName)
  const buyAssetNativePrecision = getNativePrecision(buyAsset.assetId, swapperName)

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(swapperName)

  const inputSlippageBps = convertDecimalPercentageToBasisPoints(slippageTolerancePercentageDecimal)

  const supportedChainNamespaces: string[] = [
    CHAIN_NAMESPACE.Evm,
    CHAIN_NAMESPACE.Utxo,
    CHAIN_NAMESPACE.CosmosSdk,
    CHAIN_NAMESPACE.Solana,
    CHAIN_NAMESPACE.Tron,
  ]

  if (!supportedChainNamespaces.includes(chainNamespace)) {
    return Err(
      makeSwapErrorRight({
        message: `${chainNamespace} is not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const baseQuoteArgs = {
    sellAsset,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    affiliateBps: requestedAffiliateBps,
    swapperName,
  }

  const maybeSwapQuote = await getQuote({ ...baseQuoteArgs, streaming: false }, deps)

  const maybeStreamingSwapQuote = await getQuote(
    { ...baseQuoteArgs, streaming: true, streamingInterval },
    deps,
  )

  if (maybeSwapQuote.isErr() && maybeStreamingSwapQuote.isErr()) {
    return Err(maybeSwapQuote.unwrapErr())
  }

  const swapQuote = maybeSwapQuote.isOk() ? maybeSwapQuote.unwrap() : undefined

  const streamingSwapQuote = maybeStreamingSwapQuote.isOk()
    ? maybeStreamingSwapQuote.unwrap()
    : undefined

  const getRouteValues = (
    quote: ThornodeQuoteResponseSuccess,
    isStreaming: boolean,
  ): ThorTradeRoute => {
    const source = getSwapSource(tradeType, isStreaming, swapperName)

    return {
      source,
      quote,
      expectedAmountOutThorBaseUnit: bnOrZero(quote.expected_amount_out).toFixed(),
      isStreaming,
      affiliateBps: quote.fees.affiliate === '0' ? '0' : requestedAffiliateBps,
      // always use auto stream slippage limit (0 limit = 5bps - 50bps, sometimes up to 100bps)
      // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
      slippageBps: isStreaming ? bn(0) : inputSlippageBps,
      estimatedExecutionTimeMs: quote.total_swap_seconds
        ? 1000 * quote.total_swap_seconds
        : undefined,
    }
  }

  const perRouteValues: ThorTradeRoute[] = []

  if (swapQuote) perRouteValues.push(getRouteValues(swapQuote, false))
  if (streamingSwapQuote) perRouteValues.push(getRouteValues(streamingSwapQuote, true))

  const recommendedMinAmountIn =
    swapQuote?.recommended_min_amount_in ?? streamingSwapQuote?.recommended_min_amount_in

  // recommended_min_amount_in should be the same value for both types of swaps
  const recommendedMinimumCryptoBaseUnit = recommendedMinAmountIn
    ? convertPrecision({
        value: recommendedMinAmountIn,
        inputExponent: sellAssetNativePrecision,
        outputExponent: sellAsset.precision,
      }).toFixed()
    : '0'

  const getRouteBuyAmountBeforeFeesCryptoBaseUnit = (quote: ThornodeQuoteResponseSuccess) => {
    const buyAmountBeforeFeesCryptoThorPrecision = bn(quote.expected_amount_out).plus(
      quote.fees.total,
    )
    return BigAmount.fromPrecision({
      value: BigAmount.fromBaseUnit({
        value: buyAmountBeforeFeesCryptoThorPrecision,
        precision: buyAssetNativePrecision,
      }).toPrecision(),
      precision: buyAsset.precision,
    }).toBaseUnit()
  }

  const getProtocolFees = (quote: ThornodeQuoteResponseSuccess): QuoteFeeData['protocolFees'] => {
    // Fees consist of liquidity, outbound, and affiliate fees
    // For the purpose of displaying protocol fees to the user, we don't need the latter
    // The reason for that is the affiliate fee is shown as its own "ShapeShift fee" section
    // Including the affiliate fee here would result in the protocol fee being wrong, as affiliate fees would be
    // double accounted for both in protocol fees, and affiliate fee
    const buyAssetTradeFeeBuyAssetCryptoThorPrecision = bnOrZero(quote.fees.total).minus(
      quote.fees.affiliate,
    )

    const buyAssetTradeFeeBuyAssetCryptoBaseUnit = convertPrecision({
      value: buyAssetTradeFeeBuyAssetCryptoThorPrecision,
      inputExponent: buyAssetNativePrecision,
      outputExponent: buyAsset.precision,
    })

    const protocolFees: Record<AssetId, ProtocolFee> = {}

    if (!buyAssetTradeFeeBuyAssetCryptoBaseUnit.isZero()) {
      protocolFees[buyAsset.assetId] = {
        amountCryptoBaseUnit: buyAssetTradeFeeBuyAssetCryptoBaseUnit.toFixed(0),
        requiresBalance: false,
        asset: buyAsset,
      }
    }

    return protocolFees
  }

  const routes: ThorL1TradeContext[] = perRouteValues.map(route => {
    const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
      value: route.expectedAmountOutThorBaseUnit,
      inputExponent: buyAssetNativePrecision,
      outputExponent: buyAsset.precision,
    }).toFixed(0)

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    return {
      tradeCommon: {
        id: uuid(),
        rate,
        affiliateBps: route.affiliateBps,
        isStreaming: route.isStreaming,
        slippageTolerancePercentageDecimal: route.isStreaming
          ? undefined
          : slippageTolerancePercentageDecimal,
        swapperName,
        tradeType,
        expiry: route.quote.expiry,
        recommendedMinimumCryptoBaseUnit,
      },
      stepCommon: {
        estimatedExecutionTimeMs: route.estimatedExecutionTimeMs,
        rate,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
        buyAmountBeforeFeesCryptoBaseUnit: getRouteBuyAmountBeforeFeesCryptoBaseUnit(route.quote),
        buyAmountAfterFeesCryptoBaseUnit,
        source: route.source,
        buyAsset,
        sellAsset,
        affiliateFee: buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps: route.affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit,
          buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        }),
        swapperMetadata:
          swapperName === SwapperNameEnum.Mayachain
            ? { name: 'mayachain', maxStreamingQuantity: route.quote.max_streaming_quantity }
            : { name: 'thorchain', maxStreamingQuantity: route.quote.max_streaming_quantity },
      },
      route,
      protocolFees: getProtocolFees(route.quote),
      stepDataArgs: {
        deps,
        sellAsset,
        swapperName,
        tradeType,
        sellAmountCryptoBaseUnit,
        expiry: route.quote.expiry,
        rawMemo: route.quote.memo,
      },
    }
  })

  return Ok(routes)
}
