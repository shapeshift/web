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

import { initialTradeExecutionState } from './constants'
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
  return [...unorderedQuotes].sort((a, b) => {
    switch (sortOption) {
      case QuoteSortOption.FASTEST: {
        const aScore = getQuoteExecutionTime(a)
        const bScore = getQuoteExecutionTime(b)

        // Handle undefined times (push to end)
        if (aScore === Number.MAX_SAFE_INTEGER && bScore === Number.MAX_SAFE_INTEGER) return 0
        if (aScore === Number.MAX_SAFE_INTEGER) return 1
        if (bScore === Number.MAX_SAFE_INTEGER) return -1

        return aScore - bScore // Ascending (fastest first)
      }

      case QuoteSortOption.LOWEST_GAS: {
        const aScore = getQuoteNetworkFee(a)
        const bScore = getQuoteNetworkFee(b)

        // Handle unknown gas (push to end)
        const aIsMax = aScore.eq(Number.MAX_SAFE_INTEGER)
        const bIsMax = bScore.eq(Number.MAX_SAFE_INTEGER)

        if (aIsMax && bIsMax) return 0
        if (aIsMax) return 1
        if (bIsMax) return -1

        return aScore.minus(bScore).toNumber() // Ascending (lowest first)
      }

      case QuoteSortOption.BEST_RATE:
      default: {
        const aScore = getQuoteBuyAmountAfterAfterFees(a)
        const bScore = getQuoteBuyAmountAfterAfterFees(b)

        return bScore.minus(aScore).toNumber() // Descending (highest first)
      }
    }
  })
}

const getQuoteBuyAmountAfterAfterFees = (quote: ApiQuote): BigNumber => {
  if (!quote.quote?.steps?.length) return bn(0)
  const lastStep = quote.quote.steps[quote.quote.steps.length - 1]
  return bnOrZero(lastStep.buyAmountAfterFeesCryptoBaseUnit)
}

const getQuoteExecutionTime = (quote: ApiQuote): number => {
  if (!quote.quote?.steps?.length) return Number.MAX_SAFE_INTEGER

  if (quote.quote.steps.every(step => step.estimatedExecutionTimeMs === undefined)) {
    return Number.MAX_SAFE_INTEGER
  }

  return quote.quote.steps.reduce((total, step) => {
    return total + (step.estimatedExecutionTimeMs ?? 0)
  }, 0)
}

const getQuoteNetworkFee = (quote: ApiQuote): BigNumber => {
  return getNetworkFeeUserCurrency(quote.quote)
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

export const getBestQuotesByCategory = (quotes: ApiQuote[]) => {
  if (!quotes.length) {
    return { bestRate: undefined, fastest: undefined, lowestGas: undefined }
  }

  let bestRateQuote = quotes[0]
  let fastestQuote = quotes[0]
  let lowestGasQuote = quotes[0]

  let bestRateScore = getQuoteBuyAmountAfterAfterFees(bestRateQuote)
  let fastestScore = getQuoteExecutionTime(fastestQuote)
  let lowestGasScore = getQuoteNetworkFee(lowestGasQuote)

  for (const quote of quotes) {
    const rateScore = getQuoteBuyAmountAfterAfterFees(quote)
    const timeScore = getQuoteExecutionTime(quote)
    const gasScore = getQuoteNetworkFee(quote)

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
    bestRate: bestRateQuote.id,
    fastest: fastestQuote.id,
    lowestGas: lowestGasQuote.id,
  }
}

export const createInitialTradeExecutionState = () => structuredClone(initialTradeExecutionState)
