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
  let iteratees: ((quote: ApiQuote) => any)[] = []
  let sortOrders: ('asc' | 'desc')[] = []

  switch (sortOption) {
    case QuoteSortOption.LOWEST_GAS:
      iteratees = [
        // First sort by whether the quote has valid gas data
        (quote: ApiQuote) => {
          // Assume latest if no steps are present
          if (!quote.quote?.steps) return true // Will be sorted after quotes with steps

          // Unknown gas - assume latest
          if (quote.quote.steps.every(step => !step?.feeData?.networkFeeCryptoBaseUnit))
            return true // Will be sorted after quotes with known gas fees

          return false // Valid gas data comes first
        },
        // Then sort by the actual fee amount
        (quote: ApiQuote) => {
          if (!quote.quote?.steps) return bn(MAX_SORT_VALUE)

          const totalNetworkFee = quote.quote.steps.reduce((total, step) => {
            if (!step?.feeData?.networkFeeCryptoBaseUnit) return total
            return total.plus(bnOrZero(step.feeData.networkFeeCryptoBaseUnit))
          }, bn(0))

          return totalNetworkFee
        }
      ]
      sortOrders = ['asc', 'asc'] // Ascending order for lowest gas
      break

    case QuoteSortOption.FASTEST:
      iteratees = [
        // Custom function that returns a comparable value for sorting
        (quote: ApiQuote) => {
          // If quote or steps are undefined, sort after quotes with steps
          if (!quote.quote?.steps) return true

          // Calculate the total execution time across all steps
          const totalExecutionTime = quote.quote.steps.reduce((total, step) => {
            if (step?.estimatedExecutionTimeMs === undefined) return total
            return total.plus(bnOrZero(step.estimatedExecutionTimeMs))
          }, bn(0))

          // If no steps had execution time data, sort after quotes with time data
          return totalExecutionTime.eq(0)
        },
        // Secondary sort by the actual execution time
        (quote: ApiQuote) => {
          if (!quote.quote?.steps) return bn(MAX_SORT_VALUE)

          const totalExecutionTime = quote.quote.steps.reduce((total, step) => {
            if (step?.estimatedExecutionTimeMs === undefined) return total
            return total.plus(bnOrZero(step.estimatedExecutionTimeMs))
          }, bn(0))

          return totalExecutionTime
        }
      ]
      sortOrders = ['asc', 'asc'] // Ascending order for fastest
      break

    case QuoteSortOption.BEST_RATE:
    default:
      iteratees = [
        // First sort by whether the quote has valid steps
        (quote: ApiQuote) => !quote.quote?.steps?.length,
        // Then sort by the actual buy amount after fees
        (quote: ApiQuote) => {
          // Log the quote details for debugging
          console.log(`Quote ${quote.swapperName}: inputOutputRatio=${quote.inputOutputRatio}, buyAmount=${quote.quote?.steps?.[0]?.buyAmountAfterFeesCryptoBaseUnit}`);
          
          if (!quote.quote?.steps?.length) return bn(0);
          
          // Get the last step for multi-hop trades
          const steps = quote.quote.steps;
          const lastStep = steps[steps.length - 1];
          
          // Use buyAmountAfterFeesCryptoBaseUnit which should match the displayed amount
          const buyAmount = bnOrZero(lastStep.buyAmountAfterFeesCryptoBaseUnit);
          
          // Log the value we're using for sorting
          console.log(`  Using buyAmount for sorting: ${buyAmount.toString()}`);
          
          return buyAmount;
        },
        // Then by inputOutputRatio as a fallback
        (quote: ApiQuote) => quote.inputOutputRatio !== undefined 
          ? bnOrZero(quote.inputOutputRatio) 
          : bn(0),
        // Finally by swapper name
        (quote: ApiQuote) => quote.swapperName,
      ]
      sortOrders = ['asc', 'desc', 'desc', 'asc'] // First asc (false before true), then desc for values
      break
  }

  // Log the sort option for debugging
  console.log('Sorting quotes with option:', sortOption)

  const orderedQuotes = orderBy(unorderedQuotes, iteratees, sortOrders)

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
  const happyQuotes = sortApiQuotes(
    allQuotes.filter(({ errors }) => errors.length === 0),
    sortOption,
  )
  const errorQuotes = sortApiQuotes(
    allQuotes.filter(({ errors }) => errors.length > 0),
    sortOption,
  )
  return [...happyQuotes, ...errorQuotes]
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
