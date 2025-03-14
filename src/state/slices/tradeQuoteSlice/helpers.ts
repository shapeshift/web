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
    }).price

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
  // First, filter out quotes with errors - those belong in the unavailable section
  const quotesWithoutErrors = unorderedQuotes.filter(quote => quote.errors.length === 0)

  // Custom sorting function rather than an orderBy iteratee to keep my sanity, since this didn't play too well with it
  if (sortOption === QuoteSortOption.FASTEST) {
    const sorted = [...quotesWithoutErrors].sort((a, b) => {
      const getExecutionTime = (quote: ApiQuote) => {
        if (!quote.quote?.steps?.length) return undefined

        // Note, we *need* this and don't want to sum to 0. undefined and 0 have two v. diff meanings
        if (quote.quote.steps.every(step => step.estimatedExecutionTimeMs === undefined)) {
          return undefined
        }

        return quote.quote.steps.reduce((total, step) => {
          // Opt chain to keep tsc happy, we already know it will be defined after the above check
          return total + (step.estimatedExecutionTimeMs ?? 0)
        }, 0)
      }

      const aTime = getExecutionTime(a)
      const bTime = getExecutionTime(b)

      if (aTime === undefined && bTime === undefined) return 0
      if (aTime === undefined) return 1 // Push undefined to last, we don't know the ETA here
      if (bTime === undefined) return -1 // Keep defined ETA above undefined

      // Number compare is safe since we're dealing with unix timestamps
      return aTime - bTime
    })
    return sorted
  }
  const iteratees: ((quote: ApiQuote) => any)[] = (() => {
    switch (sortOption) {
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
          (quote: ApiQuote) => {
            return getNetworkFeeUserCurrency(quote.quote)
          },
        ]
      case QuoteSortOption.BEST_RATE:
      default:
        return [
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
    }
  })()

  const sortOrders: ('asc' | 'desc')[] = (() => {
    switch (sortOption) {
      case QuoteSortOption.LOWEST_GAS:
        return ['asc', 'asc'] // Lowest to highest network fees
      case QuoteSortOption.BEST_RATE:
      default:
        return ['desc'] // Highest to lowest received amount after fees
    }
  })()

  const ordered = orderBy(quotesWithoutErrors, iteratees, sortOrders)

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
