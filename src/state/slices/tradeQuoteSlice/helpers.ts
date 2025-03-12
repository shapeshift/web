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
  sortOption: QuoteSortOption = QuoteSortOption.AUTO
): ApiQuote[] => {
  let iteratees: ((quote: ApiQuote) => any)[] = [];
  let sortOrders: ('asc' | 'desc')[] = [];
  
  switch (sortOption) {
    case QuoteSortOption.LOWEST_GAS:
      // For LOWEST_GAS, create a custom iteratee that calculates the total network fee
      // and handles undefined values by placing them at the end
      iteratees = [
        (quote: ApiQuote) => {
          // If quote or steps are undefined, return Infinity to place at the end
          if (!quote.quote?.steps) return Infinity;
          
          // Calculate the total network fee across all steps
          try {
            const totalNetworkFee = quote.quote.steps.reduce((total: bigint, step) => {
              // If networkFeeCryptoBaseUnit is undefined, treat as maximum value
              if (!step?.feeData?.networkFeeCryptoBaseUnit) return total;
              
              try {
                return total + BigInt(step.feeData.networkFeeCryptoBaseUnit);
              } catch (e) {
                // If we can't parse as BigInt, just return the current total
                return total;
              }
            }, BigInt(0));
            
            // Return the string representation for sorting
            return totalNetworkFee.toString();
          } catch (e) {
            // If any error occurs during calculation, place at the end
            return Infinity;
          }
        }
      ];
      sortOrders = ['asc']; // Ascending order for lowest gas
      break;
      
    case QuoteSortOption.FASTEST:
      // Sort by estimated execution time, with undefined values at the end
      iteratees = [
        (quote: ApiQuote) => {
          // Access estimatedExecutionTimeMs from the quote object
          const time = quote.quote?.steps?.[0]?.estimatedExecutionTimeMs;
          // If time is undefined, return Infinity to place at the end
          return time !== undefined ? time : Infinity;
        }
      ];
      sortOrders = ['asc']; // Ascending order for fastest
      break;
      
    case QuoteSortOption.BEST_RATE:
      // Sort by input/output ratio, with undefined values at the end
      iteratees = [
        (quote: ApiQuote) => {
          const ratio = quote.inputOutputRatio;
          // If ratio is undefined, return -Infinity to place at the end (since we sort desc)
          return ratio !== undefined ? ratio : -Infinity;
        }
      ];
      sortOrders = ['desc']; // Descending order for best rate
      break;
      
    case QuoteSortOption.AUTO:
    default:
      // Use the original sorting logic with custom iteratees to handle undefined values
      iteratees = [
        (quote: ApiQuote) => quote.inputOutputRatio !== undefined ? quote.inputOutputRatio : -Infinity,
        (quote: ApiQuote) => quote.quote?.rate !== undefined ? quote.quote.rate : -Infinity,
        (quote: ApiQuote) => quote.swapperName
      ];
      sortOrders = ['desc', 'desc', 'asc'];
  }
  
  // Log the sort option for debugging
  console.log('Sorting quotes with option:', sortOption);
  
  const orderedQuotes = orderBy(unorderedQuotes, iteratees, sortOrders);
  
  // Only use partitioning for the AUTO option
  if (sortOption === QuoteSortOption.AUTO) {
    const [quotesWithKnownFees, quotesWithUnknownFees] = partition(orderedQuotes, isKnownNetworkFees);
    return [...quotesWithKnownFees, ...quotesWithUnknownFees];
  }
  
  // For specific criteria, return the sorted list directly
  return orderedQuotes;
}

export const sortTradeQuotes = (
  tradeQuotes: PartialRecord<SwapperName, Record<string, ApiQuote>>,
  sortOption: QuoteSortOption = QuoteSortOption.AUTO
): ApiQuote[] => {
  console.log('sortTradeQuotes called with sortOption:', sortOption);
  const allQuotes = Object.values(tradeQuotes)
    .filter(isSome)
    .map(swapperQuotes => Object.values(swapperQuotes))
    .flat()
  const happyQuotes = sortApiQuotes(allQuotes.filter(({ errors }) => errors.length === 0), sortOption)
  const errorQuotes = sortApiQuotes(allQuotes.filter(({ errors }) => errors.length > 0), sortOption)
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
