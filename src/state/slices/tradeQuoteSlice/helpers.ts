import type { AssetId } from '@shapeshiftoss/caip'
import { cosmosChainId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectCryptoMarketData,
  selectMarketDataByFilter,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { sumProtocolFeesToDenom } from 'state/slices/tradeQuoteSlice/utils'
import { store } from 'state/store'

const getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate = (
  tradeQuoteStep: TradeQuote2['steps'][number],
  getFeeAssetUserCurrencyRate: (feeAssetId: AssetId) => string,
): BigNumber | undefined => {
  // TODO(gomes): handle osmo swapper crazy network fee logic here
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

// TODO: this logic is duplicated - consolidate it ASAP
// NOTE: "Receive side" refers to "last hop AND buy asset AND receive account".
// TODO: we'll need a check to ensure any fees included here impact the final amount received in the
// receive account
const _getReceiveSideAmountsCryptoBaseUnit = ({
  quote,
  swapperName,
}: {
  quote: TradeQuote2
  swapperName: SwapperName
}) => {
  const lastStep = quote.steps[quote.steps.length - 1]
  const firstStep = quote.steps[0]
  const rate = lastStep.rate
  const slippageDecimalPercentage =
    quote.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(swapperName)

  const buyAmountCryptoBaseUnit = bn(lastStep.buyAmountBeforeFeesCryptoBaseUnit)
  const slippageAmountCryptoBaseUnit = buyAmountCryptoBaseUnit.times(slippageDecimalPercentage)

  // Network fee represented as protocol fee for Osmosis swaps
  const buySideNetworkFeeCryptoBaseUnit =
    swapperName === SwapperName.Osmosis
      ? (() => {
          const isAtomOsmo = firstStep.sellAsset.chainId === cosmosChainId

          // Subtract ATOM fees converted to OSMO for ATOM -> OSMO
          if (isAtomOsmo) {
            const otherDenomFee = lastStep.feeData.protocolFees[firstStep.sellAsset.assetId]
            if (!otherDenomFee) return '0'
            return bnOrZero(otherDenomFee.amountCryptoBaseUnit).times(rate)
          }

          const firstHopNetworkFee = firstStep.feeData.networkFeeCryptoBaseUnit
          // Subtract the first-hop network fees for OSMO -> ATOM, which aren't automagically subtracted in the multi-hop abstraction
          return bnOrZero(firstHopNetworkFee)
        })()
      : bn(0)

  const sellAssetProtocolFee = firstStep.feeData.protocolFees[firstStep.sellAsset.assetId]
  const buyAssetProtocolFee = lastStep.feeData.protocolFees[lastStep.buyAsset.assetId]
  const sellSideProtocolFeeCryptoBaseUnit = bnOrZero(sellAssetProtocolFee?.amountCryptoBaseUnit)
  const sellSideProtocolFeeBuyAssetBaseUnit = bnOrZero(
    convertPrecision({
      value: sellSideProtocolFeeCryptoBaseUnit,
      inputExponent: firstStep.sellAsset.precision,
      outputExponent: lastStep.buyAsset.precision,
    }),
  ).times(rate)
  const buySideProtocolFeeCryptoBaseUnit = bnOrZero(buyAssetProtocolFee?.amountCryptoBaseUnit)

  const netReceiveAmountCryptoBaseUnit = buyAmountCryptoBaseUnit
    .minus(slippageAmountCryptoBaseUnit)
    .minus(buySideNetworkFeeCryptoBaseUnit)
    .minus(buySideProtocolFeeCryptoBaseUnit)
    .minus(sellSideProtocolFeeBuyAssetBaseUnit)

  return {
    netReceiveAmountCryptoBaseUnit,
    buySideNetworkFeeCryptoBaseUnit,
    buySideProtocolFeeCryptoBaseUnit,
    slippageAmountCryptoBaseUnit,
  }
}

const getTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate = (
  quote: TradeQuote2,
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
  tradeQuoteStep: TradeQuote2['steps'][number],
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
  tradeQuoteStep: TradeQuote2['steps'][number],
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
 * @param swapperName The swapper name
 * @returns The total receive amount across all hops in crypto precision after protocol fees are deducted
 */
export const getNetReceiveAmountCryptoPrecision = ({
  quote,
  swapperName,
}: {
  quote: TradeQuote2
  swapperName: SwapperName
}) => {
  const lastStep = quote.steps[quote.steps.length - 1]

  const { netReceiveAmountCryptoBaseUnit } = _getReceiveSideAmountsCryptoBaseUnit({
    quote,
    swapperName,
  })

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
export const getTotalNetworkFeeUserCurrencyPrecision = (quote: TradeQuote2) => {
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

// TODO(woodenfurniture): this assumes `requiresBalance` is the same for steps for a given asset
export const getTotalProtocolFeeByAsset = (quote: TradeQuote2): Record<AssetId, ProtocolFee> =>
  quote.steps.reduce<Record<AssetId, ProtocolFee>>((acc, step) => {
    return Object.entries(step.feeData.protocolFees).reduce<Record<AssetId, ProtocolFee>>(
      (innerAcc, [assetId, protocolFee]) => {
        if (!protocolFee) return innerAcc
        if (innerAcc[assetId] === undefined) {
          innerAcc[assetId] = protocolFee
          return innerAcc
        }

        innerAcc[assetId] = {
          ...innerAcc[assetId],
          amountCryptoBaseUnit: bn(innerAcc[assetId].amountCryptoBaseUnit)
            .plus(protocolFee.amountCryptoBaseUnit)
            .toString(),
        }
        return innerAcc
      },
      acc,
    )
  }, {})
