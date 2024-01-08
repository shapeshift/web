import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee, TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectCryptoMarketData,
  selectMarketDataByFilter,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { sumProtocolFeesToDenom } from 'state/slices/tradeQuoteSlice/utils'
import { store } from 'state/store'

const getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate = (
  tradeQuoteStep: TradeQuote['steps'][number],
  getFeeAssetUserCurrencyRate: (feeAssetId: AssetId) => string,
): BigNumber | undefined => {
  const feeAsset = selectFeeAssetById(store.getState(), tradeQuoteStep?.sellAsset.assetId)

  if (feeAsset === undefined)
    throw Error(`missing fee asset for assetId ${tradeQuoteStep.sellAsset.assetId}`)

  const feeAssetUserCurrencyRate = getFeeAssetUserCurrencyRate(feeAsset.assetId)

  const networkFeeCryptoBaseUnit = tradeQuoteStep.feeData.networkFeeCryptoBaseUnit

  if (!networkFeeCryptoBaseUnit) return // network fee is unknown

  const networkFeeFiatPrecision = bnOrZero(
    fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset.precision),
  ).times(feeAssetUserCurrencyRate)

  return networkFeeFiatPrecision
}

const getTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate = (
  quote: TradeQuote,
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber =>
  quote.steps.reduce((acc, step) => {
    const networkFeeFiatPrecision = getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate(
      step,
      getFeeAssetRate,
    )
    return acc.plus(networkFeeFiatPrecision ?? '0')
  }, bn(0))

export const getHopTotalProtocolFeesFiatPrecision = (
  tradeQuoteStep: TradeQuote['steps'][number],
): string => {
  const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())
  const cryptoMarketDataById = selectCryptoMarketData(store.getState())
  return sumProtocolFeesToDenom({
    cryptoMarketDataById,
    protocolFees: tradeQuoteStep.feeData.protocolFees,
    outputExponent: 0,
    outputAssetPriceUsd: userCurrencyToUsdRate,
  })
}

export const getHopTotalNetworkFeeFiatPrecision = (
  tradeQuoteStep: TradeQuote['steps'][number],
): string | undefined => {
  const state = store.getState()
  const getFeeAssetUserCurrencyRate = (feeAssetId: AssetId) =>
    selectMarketDataByFilter(state, {
      assetId: feeAssetId,
    }).price
  return getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate(
    tradeQuoteStep,
    getFeeAssetUserCurrencyRate,
  )?.toString()
}

/**
 * Computes the total receive amount across all hops after protocol fees are deducted
 * @param quote The trade quote
 * @returns The total receive amount across all hops in crypto precision after protocol fees are deducted
 */
export const getBuyAmountAfterFeesCryptoPrecision = ({ quote }: { quote: TradeQuote }) => {
  const lastStep = quote.steps[quote.steps.length - 1]
  const netReceiveAmountCryptoBaseUnit = lastStep.buyAmountAfterFeesCryptoBaseUnit

  const netReceiveAmountCryptoPrecision = fromBaseUnit(
    netReceiveAmountCryptoBaseUnit,
    lastStep.buyAsset.precision,
  )

  return netReceiveAmountCryptoPrecision.toString()
}

/**
 * Computes the total network fee across all hops
 * @param quote The trade quote
 * @returns The total network fee across all hops in fiat precision
 */
export const getTotalNetworkFeeUserCurrencyPrecision = (quote: TradeQuote) => {
  const state = store.getState()
  const getFeeAssetUserCurrencyRate = (feeAssetId: AssetId) =>
    selectMarketDataByFilter(state, {
      assetId: feeAssetId,
    }).price

  return getTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate(
    quote,
    getFeeAssetUserCurrencyRate,
  ).toString()
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
