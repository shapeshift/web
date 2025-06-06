import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/chain-adapters'
import {
  assertUnreachable,
  bn,
  bnOrZero,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
  fromBaseUnit,
  isFulfilled,
  isRejected,
  toBaseUnit,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../index'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeRateInput,
  ProtocolFee,
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../types'
import { TradeQuoteError } from '../types'
import { makeSwapErrorRight } from '../utils'
import * as evm from './evm'
import { getLimitWithManualSlippage } from './getLimitWithManualSlippage/getLimitWithManualSlippage'
import { getQuote } from './getQuote'
import {
  addLimitToMemo,
  assertAndProcessMemo,
  getAffiliate,
  getNativePrecision,
  getSwapSource,
} from './index'
import type {
  ThorEvmTradeQuote,
  ThorEvmTradeRate,
  ThornodeQuoteResponseSuccess,
  ThorTradeQuote,
  ThorTradeRate,
  ThorTradeRoute,
  ThorTradeUtxoOrCosmosQuote,
  ThorTradeUtxoOrCosmosRate,
  TradeType,
} from './types'
import * as utxo from './utxo'

const SAFE_GAS_LIMIT = '100000' // depositWithExpiry()

type ThorTradeRateOrQuote = ThorTradeRate | ThorTradeQuote
type ThorEvmTradeRateOrQuote = ThorEvmTradeRate | ThorEvmTradeQuote
type ThorUtxoOrCosmosTradeRateOrQuote = ThorTradeUtxoOrCosmosRate | ThorTradeUtxoOrCosmosQuote

type MakeThorTradeInputBase = {
  route: ThorTradeRoute
  memo: string
  allowanceContract: string
  feeData: QuoteFeeData
}

type MakeThorTradeInput<T extends ThorTradeRateOrQuote> = T extends ThorEvmTradeRateOrQuote
  ? MakeThorTradeInputBase & {
      data: string
      router: string
      vault: string
    }
  : MakeThorTradeInputBase & {
      data?: never
      router?: never
      vault?: never
    }

export const getL1RateOrQuote = async <T extends ThorTradeRateOrQuote>(
  input: T extends ThorTradeRate ? GetTradeRateInput : CommonTradeQuoteInput,
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
  } = input

  const {
    config,
    assertGetEvmChainAdapter,
    assertGetUtxoChainAdapter,
    assertGetCosmosSdkChainAdapter,
  } = deps

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

  if (maybeSwapQuote.isErr()) return Err(maybeSwapQuote.unwrapErr())
  const swapQuote = maybeSwapQuote.unwrap()

  const maybeStreamingSwapQuote = await getQuote(
    { ...baseQuoteArgs, streaming: true, streamingInterval },
    deps,
  )

  if (maybeStreamingSwapQuote?.isErr()) return Err(maybeStreamingSwapQuote.unwrapErr())
  const streamingSwapQuote = maybeStreamingSwapQuote?.unwrap()

  // recommended_min_amount_in should be the same value for both types of swaps
  const recommendedMinimumCryptoBaseUnit = swapQuote.recommended_min_amount_in
    ? convertPrecision({
        value: swapQuote.recommended_min_amount_in,
        inputExponent: sellAssetNativePrecision,
        outputExponent: sellAsset.precision,
      }).toFixed()
    : '0'

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

  const perRouteValues = [getRouteValues(swapQuote, false)]

  if (
    streamingSwapQuote &&
    swapQuote.expected_amount_out !== streamingSwapQuote.expected_amount_out
  ) {
    perRouteValues.push(getRouteValues(streamingSwapQuote, true))
  }

  const getRouteRate = (expectedAmountOutThorBaseUnit: string) => {
    const sellAmountCryptoPrecision = fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision)
    // all pool amounts are native precision regardless of token precision
    const sellAmountCryptoThorBaseUnit = bn(
      toBaseUnit(sellAmountCryptoPrecision, buyAssetNativePrecision),
    )

    return bnOrZero(expectedAmountOutThorBaseUnit).div(sellAmountCryptoThorBaseUnit).toFixed()
  }

  const getRouteBuyAmountBeforeFeesCryptoBaseUnit = (quote: ThornodeQuoteResponseSuccess) => {
    const buyAmountBeforeFeesCryptoThorPrecision = bn(quote.expected_amount_out).plus(
      quote.fees.total,
    )
    return toBaseUnit(
      fromBaseUnit(buyAmountBeforeFeesCryptoThorPrecision, buyAssetNativePrecision),
      buyAsset.precision,
    )
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
        amountCryptoBaseUnit: buyAssetTradeFeeBuyAssetCryptoBaseUnit.toString(),
        requiresBalance: false,
        asset: buyAsset,
      }
    }

    return protocolFees
  }

  const getMemo = (route: ThorTradeRoute) => {
    if (input.quoteOrRate === 'rate') return ''

    if (!route.quote.memo) throw new Error('no memo provided')

    // always use auto stream quote memo (0 limit = 5bps - 50bps, sometimes up to 100bps)
    // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
    if (route.isStreaming) return assertAndProcessMemo(route.quote.memo, getAffiliate(swapperName))

    const limitWithManualSlippage = getLimitWithManualSlippage({
      expectedAmountOutThorBaseUnit: route.expectedAmountOutThorBaseUnit,
      slippageBps: route.slippageBps,
    })

    return addLimitToMemo({
      memo: route.quote.memo,
      limit: limitWithManualSlippage,
      affilate: getAffiliate(swapperName),
    })
  }

  const makeThorTradeRateOrQuote = <U extends ThorTradeRateOrQuote>({
    route,
    memo,
    allowanceContract,
    feeData,
    data,
    router,
    vault,
  }: MakeThorTradeInput<U>): T => {
    const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
      value: route.expectedAmountOutThorBaseUnit,
      inputExponent: buyAssetNativePrecision,
      outputExponent: buyAsset.precision,
    }).toFixed()

    const rate = getRouteRate(route.expectedAmountOutThorBaseUnit)
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
        },
      ],
    } as T
  }

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const { supportsEIP1559 } = input as GetEvmTradeRateInput | GetEvmTradeQuoteInput

      const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

      const maybeRoutes = await Promise.allSettled(
        perRouteValues.map(async (route): Promise<T> => {
          const memo = getMemo(route)

          const { data, router, vault } = await evm.getThorTxData({
            sellAsset,
            sellAmountCryptoBaseUnit,
            memo,
            expiry: route.quote.expiry,
            config,
            swapperName,
          })

          const { average } = await adapter.getGasFeeData()

          const networkFeeCryptoBaseUnit = adapters.evm.calcNetworkFeeCryptoBaseUnit({
            ...average,
            supportsEIP1559,
            gasLimit: SAFE_GAS_LIMIT,
          })

          return makeThorTradeRateOrQuote<ThorEvmTradeRateOrQuote>({
            route,
            memo,
            allowanceContract: router,
            data,
            router,
            vault,
            feeData: {
              protocolFees: getProtocolFees(route.quote),
              networkFeeCryptoBaseUnit,
            },
          })
        }),
      )

      const routes = maybeRoutes.filter(isFulfilled).map(maybeRoute => maybeRoute.value)

      if (!routes.length)
        return Err(
          makeSwapErrorRight({
            message: 'Unable to create any routes',
            code: TradeQuoteError.UnsupportedTradePair,
            cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
          }),
        )

      return Ok(routes)
    }
    case CHAIN_NAMESPACE.Utxo: {
      const { xpub = '' } = input as GetUtxoTradeRateInput

      const sellAdapter = assertGetUtxoChainAdapter(sellAsset.chainId)

      const maybeRoutes = await Promise.allSettled(
        perRouteValues.map(async (route): Promise<T> => {
          const memo = getMemo(route)

          const { vault } = await utxo.getThorTxData({ sellAsset, config, swapperName })

          const feeData = await (async (): Promise<QuoteFeeData> => {
            const protocolFees = getProtocolFees(route.quote)

            // This is a rate without a wallet connected, so we can't get fees
            if (!xpub) return { networkFeeCryptoBaseUnit: undefined, protocolFees }

            const { average } = await sellAdapter.getFeeData({
              to: vault,
              value: sellAmountCryptoBaseUnit,
              chainSpecific: { pubkey: xpub, opReturnData: memo },
            })

            return {
              networkFeeCryptoBaseUnit: average.txFee,
              protocolFees,
              chainSpecific: {
                satsPerByte: average.chainSpecific.satoshiPerByte,
              },
            }
          })()

          return makeThorTradeRateOrQuote<ThorUtxoOrCosmosTradeRateOrQuote>({
            route,
            allowanceContract: '0x0', // not applicable to UTXOs
            memo,
            feeData,
          })
        }),
      )

      const routes = maybeRoutes.filter(isFulfilled).map(maybeRoute => maybeRoute.value)

      if (!routes.length)
        return Err(
          makeSwapErrorRight({
            message: 'Unable to create any routes',
            code: TradeQuoteError.UnsupportedTradePair,
            cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
          }),
        )

      return Ok(routes)
    }
    case CHAIN_NAMESPACE.CosmosSdk: {
      const cosmosChainAdapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

      const { fast } = await cosmosChainAdapter.getFeeData({})

      return Ok(
        perRouteValues.map((route): T => {
          return makeThorTradeRateOrQuote<ThorUtxoOrCosmosTradeRateOrQuote>({
            route,
            memo: getMemo(route),
            allowanceContract: '0x0', // not applicable to cosmossdk
            feeData: {
              networkFeeCryptoBaseUnit: fast.txFee,
              protocolFees: getProtocolFees(route.quote),
              chainSpecific: {
                estimatedGasCryptoBaseUnit: fast.chainSpecific.gasLimit,
              },
            },
          })
        }),
      )
    }
    case CHAIN_NAMESPACE.Solana: {
      return Err(
        makeSwapErrorRight({
          message: 'Solana is not supported',
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
    default:
      return assertUnreachable(chainNamespace)
  }
}
