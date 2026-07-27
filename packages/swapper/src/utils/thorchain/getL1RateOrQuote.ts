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
  GetTradeQuoteInput,
  GetTradeRateInput,
  ProtocolFee,
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TxBuildData,
} from '../../types'
import { SwapperName, TradeQuoteError } from '../../types'
import { getInputOutputRate, makeSwapErrorRight, makeTradeStepBuildFailedErr } from '../../utils'
import { buildAffiliateFee } from '../affiliateFee'
import { getLimitWithManualSlippage } from './getLimitWithManualSlippage/getLimitWithManualSlippage'
import { getQuote } from './getQuote'
import { getThorStepData } from './getThorStepData'
import {
  addLimitToMemo,
  assertAndProcessMemo,
  getAffiliate,
  getNativePrecision,
  getSwapSource,
} from './index'
import type {
  ThornodeQuoteResponseSuccess,
  ThorTradeQuote,
  ThorTradeRate,
  ThorTradeRoute,
  TradeType,
} from './types'

type ThorTradeRateOrQuote = ThorTradeRate | ThorTradeQuote

type MakeThorTradeInput = {
  route: ThorTradeRoute
  memo: string
  allowanceContract: string
  feeData: QuoteFeeData
  transactionData?: TxBuildData
  // Evm only
  data?: string
  router?: string
  vault?: string
}

export const getL1RateOrQuote = async <T extends ThorTradeRateOrQuote>(
  input: T extends ThorTradeRate ? GetTradeRateInput : GetTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  tradeType: TradeType,
  swapperName: SwapperName,
): Promise<Result<T[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
    receiveAddress,
    affiliateBps: requestedAffiliateBps,
    quoteOrRate,
    sendAddress,
  } = input

  if (quoteOrRate === 'quote' && !sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'sendAddress is required',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const quoteOrRateArgs =
    quoteOrRate === 'quote' && sendAddress
      ? { type: 'quote' as const, input: input as GetTradeQuoteInput, from: sendAddress }
      : { type: 'rate' as const, input: input as GetTradeRateInput, from: sendAddress }

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

  const getProtocolFees = (quote: ThornodeQuoteResponseSuccess) => {
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

  const getMemoResult = (route: ThorTradeRoute): Result<string, SwapErrorRight> => {
    if (input.quoteOrRate === 'rate') return Ok('')

    if (!route.quote.memo) return Err(makeTradeStepBuildFailedErr('getL1RateOrQuote'))

    // always use auto stream quote memo (0 limit = 5bps - 50bps, sometimes up to 100bps)
    // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
    if (route.isStreaming)
      return Ok(assertAndProcessMemo(route.quote.memo, getAffiliate(swapperName)))

    const limitWithManualSlippage = getLimitWithManualSlippage({
      expectedAmountOutThorBaseUnit: route.expectedAmountOutThorBaseUnit,
      slippageBps: route.slippageBps,
    })

    return Ok(
      addLimitToMemo({
        memo: route.quote.memo,
        limit: limitWithManualSlippage,
        affilate: getAffiliate(swapperName),
      }),
    )
  }

  const makeThorTradeRateOrQuote = ({
    route,
    memo,
    allowanceContract,
    feeData,
    data,
    router,
    vault,
    transactionData,
  }: MakeThorTradeInput): T => {
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
    const slippage = route.isStreaming ? undefined : slippageTolerancePercentageDecimal
    const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmountBeforeFeesCryptoBaseUnit(route.quote)

    return {
      id: uuid(),
      quoteOrRate: input.quoteOrRate,
      memo,
      receiveAddress,
      affiliateBps: route.affiliateBps,
      isStreaming: route.isStreaming,
      recommendedMinimumCryptoBaseUnit,
      slippageTolerancePercentageDecimal: slippage,
      rate,
      data,
      router,
      vault,
      expiry: route.quote.expiry,
      tradeType,
      swapperName,
      steps: [
        {
          estimatedExecutionTimeMs: route.estimatedExecutionTimeMs,
          rate,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          source: route.source,
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract,
          feeData,
          affiliateFee: buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps: route.affiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          }),
          swapperMetadata:
            swapperName === SwapperName.Mayachain
              ? {
                  name: 'mayachain' as const,
                  maxStreamingQuantity: route.quote.max_streaming_quantity,
                }
              : {
                  name: 'thorchain' as const,
                  maxStreamingQuantity: route.quote.max_streaming_quantity,
                },
          transactionData,
        },
      ],
    } as T
  }

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

  const maybeRoutes = await Promise.allSettled(
    perRouteValues.map(async (route): Promise<Result<T, SwapErrorRight>> => {
      const memoResult = getMemoResult(route)
      if (memoResult.isErr()) return Err(memoResult.unwrapErr())
      const memo = memoResult.unwrap()

      const stepDataResult = await getThorStepData({
        ...quoteOrRateArgs,
        deps,
        swapperName,
        tradeType,
        sellAsset,
        sellAmountCryptoBaseUnit,
        memo,
        expiry: route.quote.expiry,
        rawMemo: route.quote.memo,
      })
      if (stepDataResult.isErr()) return Err(stepDataResult.unwrapErr())
      const { vault, router, data, transactionData, networkFeeCryptoBaseUnit } =
        stepDataResult.unwrap()

      return Ok(
        makeThorTradeRateOrQuote({
          route,
          memo,
          allowanceContract: router ?? '',
          data,
          router,
          vault,
          transactionData,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: getProtocolFees(route.quote),
          },
        }),
      )
    }),
  )

  const routes: T[] = []
  let firstError: SwapErrorRight | undefined

  for (const maybeRoute of maybeRoutes) {
    // An unexpected rejection drops the route (as before); the real cause is surfaced below
    if (isRejected(maybeRoute)) continue
    if (maybeRoute.value.isOk()) routes.push(maybeRoute.value.unwrap())
    else if (!firstError) firstError = maybeRoute.value.unwrapErr()
  }

  if (!routes.length) {
    // Surface the first real step-data error (network fee / build) rather than a generic pair error
    return Err(
      firstError ??
        makeSwapErrorRight({
          message: 'Unable to create any routes',
          code: TradeQuoteError.UnsupportedTradePair,
          cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
        }),
    )
  }

  return Ok(routes)
}
