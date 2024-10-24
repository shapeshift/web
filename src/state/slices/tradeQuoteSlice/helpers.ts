import type { AssetId } from '@shapeshiftoss/caip'
import type {
  ProtocolFee,
  SwapperName,
  TradeQuote,
  TradeQuoteStep,
  TradeRate,
} from '@shapeshiftoss/swapper'
import { getHopByIndex, type SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import type { Asset, MarketData, PartialRecord } from '@shapeshiftoss/types'
import { orderBy } from 'lodash'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ApiQuote } from 'state/apis/swapper/types'
import { sumProtocolFeesToDenom } from 'state/slices/tradeQuoteSlice/utils'

import type { ActiveQuoteMeta } from './types'

export const getHopTotalNetworkFeeUserCurrencyPrecision = (
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
  quote: TradeQuote,
  getFeeAsset: (assetId: AssetId) => Asset,
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber =>
  quote.steps.reduce((acc, step) => {
    const feeAsset = getFeeAsset(step.sellAsset.assetId)
    const networkFeeFiatPrecision = getHopTotalNetworkFeeUserCurrencyPrecision(
      step.feeData.networkFeeCryptoBaseUnit,
      feeAsset,
      getFeeAssetRate,
    )
    return acc.plus(networkFeeFiatPrecision ?? '0')
  }, bn(0))

export const getHopTotalProtocolFeesFiatPrecision = (
  tradeQuoteStep: TradeQuote['steps'][number] | TradeRate['steps'][number],
  userCurrencyToUsdRate: string,
  marketDataByAssetIdUsd: Partial<Record<AssetId, MarketData>>,
): string => {
  return sumProtocolFeesToDenom({
    marketDataByAssetIdUsd,
    protocolFees: tradeQuoteStep.feeData.protocolFees,
    outputExponent: 0,
    outputAssetPriceUsd: userCurrencyToUsdRate,
  })
}

/**
 * Computes the total receive amount across all hops after protocol fees are deducted
 * @param quote The trade quote
 * @returns The total receive amount across all hops in crypto precision after protocol fees are deducted
 */
export const getBuyAmountAfterFeesCryptoPrecision = ({ quote }: { quote: TradeQuote }) => {
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
) =>
  Object.entries(step.feeData.protocolFees).reduce<Record<AssetId, ProtocolFee>>(
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

export const getTotalProtocolFeeByAssetForStep = (step: TradeQuoteStep) =>
  _reduceTotalProtocolFeeByAssetForStep({}, step)

export const getTotalProtocolFeeByAsset = (quote: TradeQuote): Record<AssetId, ProtocolFee> =>
  quote.steps.reduce<Record<AssetId, ProtocolFee>>(
    (acc, step) => _reduceTotalProtocolFeeByAssetForStep(acc, step),
    {},
  )

const sortApiQuotes = (unorderedQuotes: ApiQuote[]): ApiQuote[] => {
  return orderBy(
    unorderedQuotes,
    ['inputOutputRatio', 'quote.rate', 'swapperName'],
    ['desc', 'desc', 'asc'],
  )
}

export const sortTradeQuotes = (
  tradeQuotes: PartialRecord<SwapperName, Record<string, ApiQuote>>,
): ApiQuote[] => {
  const allQuotes = Object.values(tradeQuotes)
    .filter(isSome)
    .map(swapperQuotes => Object.values(swapperQuotes))
    .flat()
  const happyQuotes = sortApiQuotes(allQuotes.filter(({ errors }) => errors.length === 0))
  const errorQuotes = sortApiQuotes(allQuotes.filter(({ errors }) => errors.length > 0))
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
