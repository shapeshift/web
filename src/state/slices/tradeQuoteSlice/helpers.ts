import type { AssetId } from '@shapeshiftoss/caip'
import type {
  ProtocolFee,
  SupportedTradeQuoteStepIndex,
  SwapperName,
  TradeQuote,
  TradeQuoteStep,
  TradeRate,
} from '@shapeshiftoss/swapper'
import { getHopByIndex } from '@shapeshiftoss/swapper'
import type { Asset, PartialRecord } from '@shapeshiftoss/types'
import { orderBy } from 'lodash'

import type { ActiveQuoteMeta } from './types'
import { QuoteSortOption } from './types'

import type { BigNumber } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isSome } from '@/lib/utils'
import type { ApiQuote } from '@/state/apis/swapper/types'
import { selectFeeAssetById, selectMarketDataByFilter } from '@/state/slices/selectors'
import { store } from '@/state/store'

export const getHopTotalNetworkFeeUserCurrency = (
  networkFeeCryptoBaseUnit: string | undefined,
  feeAsset: Asset,
  getFeeAssetUserCurrencyRate: (feeAssetId: AssetId) => string | undefined,
): BigNumber | undefined => {
  const feeAssetUserCurrencyRate = getFeeAssetUserCurrencyRate(feeAsset.assetId)

  if (!networkFeeCryptoBaseUnit) return // network fee is unknown

  const networkFeeFiatPrecision = bnOrZero(
    fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset.precision),
  ).times(bnOrZero(feeAssetUserCurrencyRate))

  return networkFeeFiatPrecision
}

/**
 * Computes the total network fee across all hops
 * @param quote The trade quote
 * @param getFeeAsset
 * @param getFeeAssetRate
 * @returns The total network fee across all hops in fiat precision
 */
export const getTotalNetworkFeeUserCurrencyPrecision = (
  quote: TradeQuote | TradeRate,
  getFeeAsset: (assetId: AssetId) => Asset,
  getFeeAssetRate: (feeAssetId: AssetId) => string | undefined,
): BigNumber | undefined => {
  // network fee is unknown, which is different than it being akschual 0
  if (quote.steps.every(step => !step.feeData.networkFeeCryptoBaseUnit)) return

  return quote.steps.reduce((acc, step) => {
    const feeAsset = getFeeAsset(step.sellAsset.assetId)
    const networkFeeFiatPrecision = getHopTotalNetworkFeeUserCurrency(
      step.feeData.networkFeeCryptoBaseUnit,
      feeAsset,
      getFeeAssetRate,
    )
    return acc.plus(networkFeeFiatPrecision ?? '0')
  }, bn(0))
}

const getNetworkFeeUserCurrency = (quote: TradeQuote | TradeRate | undefined): BigNumber => {
  if (!quote) return bn(Number.MAX_SAFE_INTEGER)

  const state = store.getState()
  const getFeeAsset = (assetId: AssetId) => {
    const feeAsset = selectFeeAssetById(state, assetId)
    if (feeAsset === undefined) {
      throw Error(`missing fee asset for assetId ${assetId}`)
    }
    return feeAsset
  }

  const getFeeAssetUserCurrencyRate = (feeAssetId: AssetId) =>
    selectMarketDataByFilter(state, {
      assetId: feeAssetId,
    })?.price

  return (
    getTotalNetworkFeeUserCurrencyPrecision(quote, getFeeAsset, getFeeAssetUserCurrencyRate) ??
    bn(Number.MAX_SAFE_INTEGER)
  )
}

/**
 * Computes the total receive amount across all hops after protocol fees are deducted
 * @param quote The trade quote
 * @returns The total receive amount across all hops in crypto precision after protocol fees are deducted
 */
export const getBuyAmountAfterFeesCryptoPrecision = ({
  quote,
}: {
  quote: TradeQuote | TradeRate
}) => {
  const lastStepIndex = (quote.steps.length - 1) as SupportedTradeQuoteStepIndex
  const lastStep = getHopByIndex(quote, lastStepIndex)

  if (!lastStep) return '0'

  const netReceiveAmountCryptoBaseUnit = lastStep.buyAmountAfterFeesCryptoBaseUnit

  const netReceiveAmountCryptoPrecision = fromBaseUnit(
    netReceiveAmountCryptoBaseUnit,
    lastStep.buyAsset.precision,
  )

  return netReceiveAmountCryptoPrecision.toString()
}

export const _reduceTotalProtocolFeeByAssetForStep = (
  accumulator: Record<AssetId, ProtocolFee>,
  step: TradeQuoteStep,
) => {
  if (step.feeData.protocolFees === undefined) return accumulator
  return Object.entries(step.feeData.protocolFees).reduce<Record<AssetId, ProtocolFee>>(
    (innerAccumulator, [assetId, protocolFee]) => {
      if (!protocolFee) return innerAccumulator
      if (innerAccumulator[assetId] === undefined) {
        innerAccumulator[assetId] = protocolFee
        return innerAccumulator
      }

      innerAccumulator[assetId] = {
        ...innerAccumulator[assetId],
        amountCryptoBaseUnit: bn(innerAccumulator[assetId].amountCryptoBaseUnit)
          .plus(protocolFee.amountCryptoBaseUnit)
          .toString(),
      }
      return innerAccumulator
    },
    accumulator,
  )
}

export const getTotalProtocolFeeByAssetForStep = (step: TradeQuoteStep) =>
  _reduceTotalProtocolFeeByAssetForStep({}, step)

export const getTotalProtocolFeeByAsset = (
  quote: TradeQuote | TradeRate,
): Record<AssetId, ProtocolFee> =>
  quote.steps.reduce<Record<AssetId, ProtocolFee>>(
    (acc, step) => _reduceTotalProtocolFeeByAssetForStep(acc, step),
    {},
  )

const sortApiQuotes = (
  unorderedQuotes: ApiQuote[],
  sortOption: QuoteSortOption = QuoteSortOption.BEST_RATE,
): ApiQuote[] => {
  const iteratees: ((quote: ApiQuote) => any)[] = (() => {
    switch (sortOption) {
      case QuoteSortOption.FASTEST:
        return [
          // Presort by un/available execution times
          (quote: ApiQuote) => {
            const score = getFastestScore(quote)
            return score === Number.MAX_SAFE_INTEGER ? true : false
          },
          // Then sort by the actual execution time
          (quote: ApiQuote) => getFastestScore(quote),
        ]
      case QuoteSortOption.LOWEST_GAS:
        return [
          // Presort by un/available network fees
          (quote: ApiQuote) => {
            if (!quote.quote?.steps) return true

            // Unknown gas - assume latest
            if (quote.quote.steps.every(step => !step?.feeData?.networkFeeCryptoBaseUnit))
              return true

            return false
          },
          // Then sort by the actual fee amount in user currency
          (quote: ApiQuote) => getLowestGasScore(quote),
        ]
      case QuoteSortOption.BEST_RATE:
      default:
        return [(quote: ApiQuote) => getBestRateScore(quote)]
    }
  })()

  const sortOrders: ('asc' | 'desc')[] = (() => {
    switch (sortOption) {
      case QuoteSortOption.FASTEST:
      case QuoteSortOption.LOWEST_GAS:
        return ['asc', 'asc'] // Lowest to highest network fees
      case QuoteSortOption.BEST_RATE:
      default:
        return ['desc'] // Highest to lowest received amount after fees
    }
  })()

  const ordered = orderBy(unorderedQuotes, iteratees, sortOrders)

  return ordered
}

export const sortTradeQuotes = (
  tradeQuotes: PartialRecord<SwapperName, Record<string, ApiQuote>>,
  sortOption: QuoteSortOption = QuoteSortOption.BEST_RATE,
): ApiQuote[] => {
  const allQuotes = Object.values(tradeQuotes)
    .filter(isSome)
    .map(swapperQuotes => Object.values(swapperQuotes))
    .flat()

  return sortApiQuotes(allQuotes, sortOption)
}

const getBestRateScore = (quote: ApiQuote): BigNumber => {
  if (!quote.quote?.steps?.length) return bn(0)
  const lastStep = quote.quote.steps[quote.quote.steps.length - 1]
  return bnOrZero(lastStep.buyAmountAfterFeesCryptoBaseUnit)
}

const getFastestScore = (quote: ApiQuote): number => {
  if (!quote.quote?.steps?.length) return Number.MAX_SAFE_INTEGER

  if (quote.quote.steps.every(step => step.estimatedExecutionTimeMs === undefined)) {
    return Number.MAX_SAFE_INTEGER
  }

  return quote.quote.steps.reduce((total, step) => {
    return total + (step.estimatedExecutionTimeMs ?? 0)
  }, 0)
}

const getLowestGasScore = (quote: ApiQuote): BigNumber => {
  return getNetworkFeeUserCurrency(quote.quote)
}

export const getBestQuotesByCategory = (quotes: ApiQuote[]) => {
  if (!quotes.length) {
    return { best: undefined, fastest: undefined, lowestGas: undefined }
  }

  let bestRateQuote = quotes[0]
  let fastestQuote = quotes[0]
  let lowestGasQuote = quotes[0]

  let bestRateScore = getBestRateScore(bestRateQuote)
  let fastestScore = getFastestScore(fastestQuote)
  let lowestGasScore = getLowestGasScore(lowestGasQuote)

  for (const quote of quotes) {
    const rateScore = getBestRateScore(quote)
    const timeScore = getFastestScore(quote)
    const gasScore = getLowestGasScore(quote)

    // Best rate: highest buyAmountAfterFeesCryptoBaseUnit
    if (rateScore.gt(bestRateScore)) {
      bestRateScore = rateScore
      bestRateQuote = quote
    }

    // Fastest: lowest execution time
    if (timeScore < fastestScore) {
      fastestScore = timeScore
      fastestQuote = quote
    }

    // Lowest gas: lowest network fee
    if (gasScore.lt(lowestGasScore)) {
      lowestGasScore = gasScore
      lowestGasQuote = quote
    }
  }

  return {
    isBest: bestRateQuote.id,
    isFastest: fastestQuote.id,
    isLowestGas: lowestGasQuote.id,
  }
}

export const getActiveQuoteMetaOrDefault = (
  activeQuoteMeta: ActiveQuoteMeta | undefined,
  sortedQuotes: ApiQuote[],
) => {
  const bestQuote = sortedQuotes[0]
  const bestQuoteMeta = bestQuote
    ? { swapperName: bestQuote.swapperName, identifier: bestQuote.id }
    : undefined
  // Return the "best" quote even if it has errors, provided there is a quote to display data for
  // this allows users to explore trades that aren't necessarily actionable. The UI will prevent
  // executing these downstream.
  const isSelectable = bestQuote?.quote !== undefined
  const defaultQuoteMeta = isSelectable ? bestQuoteMeta : undefined
  return activeQuoteMeta ?? defaultQuoteMeta
}
