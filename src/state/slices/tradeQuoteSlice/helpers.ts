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

// Maximum value for sorting - used to place items at the end of sorted lists
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
      // For LOWEST_GAS, create a custom iteratee that calculates the total network fee
      // and handles undefined values by placing them at the end
      iteratees = [
        (quote: ApiQuote) => {
          // If quote or steps are undefined, return MAX_SORT_VALUE to place at the end
          if (!quote.quote?.steps) return MAX_SORT_VALUE

          const totalNetworkFee = quote.quote.steps.reduce((total: bigint, step) => {
            if (!step?.feeData?.networkFeeCryptoBaseUnit) return total

            return total + BigInt(step.feeData.networkFeeCryptoBaseUnit)
          }, BigInt(0))

          // Parse as number for consistent sorting (safe for reasonable fee values)
          // If the value is too large for a number, it will be Infinity which is fine for sorting
          return Number(totalNetworkFee)
        },
      ]
      sortOrders = ['asc'] // Ascending order for lowest gas
      break

    case QuoteSortOption.FASTEST:
      // Sort by estimated execution time, with undefined values at the end
      iteratees = [
        (quote: ApiQuote) => {
          // If quote or steps are undefined, return MAX_SORT_VALUE to place at the end
          if (!quote.quote?.steps) return MAX_SORT_VALUE

          // Calculate the total execution time across all steps
          const totalExecutionTime = quote.quote.steps.reduce((total: number, step) => {
            // If estimatedExecutionTimeMs is undefined, don't add anything
            if (step?.estimatedExecutionTimeMs === undefined) return total

            // Add the execution time to the total
            return total + step.estimatedExecutionTimeMs
          }, 0)

          // If no steps had execution time data, return MAX_SORT_VALUE to place at the end
          return totalExecutionTime > 0 ? totalExecutionTime : MAX_SORT_VALUE
        },
      ]
      sortOrders = ['asc'] // Ascending order for fastest
      break

    case QuoteSortOption.BEST_RATE:
    default:
      // Use the original sorting logic with custom iteratees to handle undefined values
      iteratees = [
        (quote: ApiQuote) =>
          quote.inputOutputRatio !== undefined ? quote.inputOutputRatio : -MAX_SORT_VALUE,
        (quote: ApiQuote) => (quote.quote?.rate !== undefined ? quote.quote.rate : -MAX_SORT_VALUE),
        (quote: ApiQuote) => quote.swapperName,
      ]
      sortOrders = ['desc', 'desc', 'asc']
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
