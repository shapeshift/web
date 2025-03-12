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
import { orderBy, partition } from 'lodash'

import type { ActiveQuoteMeta } from './types'
import { QuoteSortOption } from './types'

import type { BigNumber } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isSome } from '@/lib/utils'
import type { ApiQuote } from '@/state/apis/swapper/types'
import { selectFeeAssetById, selectMarketDataByFilter } from '@/state/slices/selectors'
import { store } from '@/state/store'

// Placeholder for the sort iteratee for those bad bois to go last
const MAX_SORT_VALUE = Number.MAX_SAFE_INTEGER

export const getHopTotalNetworkFeeUserCurrency = (
  networkFeeCryptoBaseUnit: string | undefined,
  feeAsset: Asset,
  getFeeAssetUserCurrencyRate: (feeAssetId: AssetId) => string,
): BigNumber | undefined => {
  const feeAssetUserCurrencyRate = getFeeAssetUserCurrencyRate(feeAsset.assetId)

  if (!networkFeeCryptoBaseUnit) return // network fee is unknown

  const networkFeeFiatPrecision = bnOrZero(
    fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset.precision),
  ).times(feeAssetUserCurrencyRate)

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
  getFeeAssetRate: (feeAssetId: AssetId) => string,
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
  if (!quote) return bn(MAX_SORT_VALUE)

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
    }).price

  return (
    getTotalNetworkFeeUserCurrencyPrecision(quote, getFeeAsset, getFeeAssetUserCurrencyRate) ??
    bn(MAX_SORT_VALUE)
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

const isKnownNetworkFees = (quote: ApiQuote): boolean => {
  return Boolean(quote?.quote?.steps?.every(step => Boolean(step.feeData.networkFeeCryptoBaseUnit)))
}

const sortApiQuotes = (
  unorderedQuotes: ApiQuote[],
  sortOption: QuoteSortOption = QuoteSortOption.BEST_RATE,
): ApiQuote[] => {
  // First, filter out quotes with errors - those belong in the unavailable section
  const quotesWithoutErrors = unorderedQuotes.filter(quote => quote.errors.length === 0)

  let iteratees: ((quote: ApiQuote) => any)[] = []
  let sortOrders: ('asc' | 'desc')[] = []

  switch (sortOption) {
    case QuoteSortOption.LOWEST_GAS:
      iteratees = [
        // Presort by un/available network fees
        (quote: ApiQuote) => {
          if (!quote.quote?.steps) return true

          // Unknown gas - assume latest
          if (quote.quote.steps.every(step => !step?.feeData?.networkFeeCryptoBaseUnit)) return true

          return false
        },
        // Then sort by the actual fee amount in user currency
        (quote: ApiQuote) => {
          return getNetworkFeeUserCurrency(quote.quote)
        },
      ]
      sortOrders = ['asc', 'asc'] // Lowest to highest network fees
      break

    case QuoteSortOption.FASTEST:
      iteratees = [
        // Presort by un/available est. execution time
        (quote: ApiQuote) => {
          if (!quote.quote?.steps) return true

          if (quote.quote.steps.every(step => step?.estimatedExecutionTimeMs === undefined))
            return true

          return false
        },
        // Secondary sort by the actual execution time
        (quote: ApiQuote) => {
          if (!quote.quote?.steps) return bn(MAX_SORT_VALUE)

          const totalExecutionTime = quote.quote.steps.reduce((total, step) => {
            if (step?.estimatedExecutionTimeMs === undefined) return total
            return total.plus(bnOrZero(step.estimatedExecutionTimeMs))
          }, bn(0))

          return totalExecutionTime
        },
      ]
      sortOrders = ['asc', 'asc'] // Lowest to highest est. execution time
      break

    case QuoteSortOption.BEST_RATE:
    default:
      iteratees = [
        (quote: ApiQuote) => {
          if (!quote.quote?.steps?.length) return bn(0)

          // Get the last step for multi-hop trades
          const steps = quote.quote.steps
          const lastStep = steps[steps.length - 1]

          // Use buyAmountAfterFeesCryptoBaseUnit which should match the displayed amount
          const buyAmount = bnOrZero(lastStep.buyAmountAfterFeesCryptoBaseUnit)

          return buyAmount
        },
      ]
      sortOrders = ['desc'] // Highest to lowest received amount after fees
      break
  }

  const orderedQuotes = orderBy(quotesWithoutErrors, iteratees, sortOrders)

  // Only use partitioning for the BEST_RATE option (previously AUTO)
  if (sortOption === QuoteSortOption.BEST_RATE) {
    const [quotesWithKnownFees, quotesWithUnknownFees] = partition(
      orderedQuotes,
      isKnownNetworkFees,
    )
    return [...quotesWithKnownFees, ...quotesWithUnknownFees]
  }

  // For specific criteria, return the sorted list directly
  return orderedQuotes
}

export const sortTradeQuotes = (
  tradeQuotes: PartialRecord<SwapperName, Record<string, ApiQuote>>,
  sortOption: QuoteSortOption = QuoteSortOption.BEST_RATE,
): ApiQuote[] => {
  const allQuotes = Object.values(tradeQuotes)
    .filter(isSome)
    .map(swapperQuotes => Object.values(swapperQuotes))
    .flat()

  // Split quotes into those with and without errors
  const quotesWithoutErrors = allQuotes.filter(quote => quote.errors.length === 0)
  const quotesWithErrors = allQuotes.filter(quote => quote.errors.length > 0)

  // Only sort quotes without errors
  const sortedHappyQuotes = sortApiQuotes(quotesWithoutErrors, sortOption)

  // Return sorted quotes without errors first, then quotes with errors
  return [...sortedHappyQuotes, ...quotesWithErrors]
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
