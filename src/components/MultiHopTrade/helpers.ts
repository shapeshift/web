import type { AssetId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapperName, TradeQuote } from 'lib/swapper/api'
import {
  selectCryptoMarketData,
  selectFeeAssetById,
  selectMarketDataByFilter,
  selectUsdRateByAssetId,
} from 'state/slices/selectors'
import { store } from 'state/store'
import { sumProtocolFeesToDenom } from 'state/zustand/swapperStore/utils'

const convertCryptoBaseUnitToUsdPrecision = (
  asset: Asset,
  amountCryptoBaseUnit: BigNumber.Value,
): BigNumber => {
  const usdRate = selectUsdRateByAssetId(store.getState(), asset.assetId)
  if (usdRate === undefined) throw Error(`missing usd rate for assetId ${asset.assetId}`)
  return bnOrZero(fromBaseUnit(amountCryptoBaseUnit, asset.precision)).times(usdRate)
}

const getReceiveSideAmountsCryptoBaseUnit = ({
  quote,
  swapperName,
}: {
  quote: TradeQuote
  swapperName: SwapperName
}) => {
  const lastStep = quote.steps[quote.steps.length - 1]
  const slippageDecimalPercentage =
    quote.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(swapperName)

  const buyAmountCryptoBaseUnit = bn(lastStep.buyAmountBeforeFeesCryptoBaseUnit)
  const slippageAmountCryptoBaseUnit = buyAmountCryptoBaseUnit.times(slippageDecimalPercentage)
  const buySideNetworkFeeCryptoBaseUnit = bn(0) // TODO(woodenfurniture): handle osmo swapper crazy netowrk fee logic here
  const buySideProtocolFeeCryptoBaseUnit = bnOrZero(
    lastStep.feeData.protocolFees[lastStep.buyAsset.assetId]?.amountCryptoBaseUnit,
  )

  const netReceiveAmountCryptoBaseUnit = buyAmountCryptoBaseUnit
    .minus(slippageAmountCryptoBaseUnit)
    .minus(buySideNetworkFeeCryptoBaseUnit)
    .minus(buySideProtocolFeeCryptoBaseUnit)

  return {
    netReceiveAmountCryptoBaseUnit,
    buySideNetworkFeeCryptoBaseUnit,
    buySideProtocolFeeCryptoBaseUnit,
    slippageAmountCryptoBaseUnit,
  }
}

/**
 * Computes the total receive amount across all hops after protocol fees are deducted
 * @param param0.quote The trade quote
 * @param param0.swapperName The swapper name
 * @returns The total receive amount across all hops in crypto precision after protocol fees are deducted
 */
export const getNetReceiveAmountCryptoPrecision = ({
  quote,
  swapperName,
}: {
  quote: TradeQuote
  swapperName: SwapperName
}) => {
  const lastStep = quote.steps[quote.steps.length - 1]

  const { netReceiveAmountCryptoBaseUnit } = getReceiveSideAmountsCryptoBaseUnit({
    quote,
    swapperName,
  })

  const netReceiveAmountCryptoPrecision = fromBaseUnit(
    netReceiveAmountCryptoBaseUnit,
    lastStep.buyAsset.precision,
  )

  return netReceiveAmountCryptoPrecision.toString()
}

const _getTotalNetworkFeePrecision = (
  quote: TradeQuote,
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber =>
  quote.steps.reduce((acc, step) => {
    // TODO(woodenfurniture): handle osmo swapper crazy netowrk fee logic here
    const feeAsset = selectFeeAssetById(store.getState(), step.sellAsset.assetId)

    if (feeAsset === undefined)
      throw Error(`missing fee asset for assetId ${step.sellAsset.assetId}`)

    const feeAssetFiatRate = getFeeAssetRate(feeAsset.assetId)

    const networkFeeCryptoBaseUnit = step.feeData.networkFeeCryptoBaseUnit
    const networkFeeFiatPrecision = bnOrZero(
      fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset.precision),
    ).times(feeAssetFiatRate)

    return acc.plus(networkFeeFiatPrecision)
  }, bn(0))

/**
 * Computes the total network fee across all hops
 * @param quote The trade quote
 * @returns The total network fee across all hops in fiat precision
 */
const getTotalNetworkFeeUsdPrecision = (quote: TradeQuote): BigNumber => {
  const state = store.getState()
  const cryptoMarketDataById = selectCryptoMarketData(state)

  const getFeeAssetUsdRate = (feeAssetId: AssetId) => {
    const feeAsset = selectFeeAssetById(state, feeAssetId)
    if (feeAsset === undefined) throw Error(`missing fee asset for assetId ${feeAssetId}`)
    const feeAssetMarketData = cryptoMarketDataById[feeAsset.assetId]
    if (feeAssetMarketData === undefined) throw Error(`missing fee asset for assetId ${feeAssetId}`)
    return feeAssetMarketData.price
  }

  return _getTotalNetworkFeePrecision(quote, getFeeAssetUsdRate)
}

/**
 * Computes the total network fee across all hops
 * @param quote The trade quote
 * @returns The total network fee across all hops in fiat precision
 */
export const getTotalNetworkFeeFiatPrecision = (quote: TradeQuote) => {
  const state = store.getState()
  const getFeeAssetFiatRate = (feeAssetId: AssetId) =>
    selectMarketDataByFilter(state, {
      assetId: feeAssetId,
    }).price

  return _getTotalNetworkFeePrecision(quote, getFeeAssetFiatRate).toString()
}

// TODO(woodenfurniture): this assumes `requiresBalance` is the same for steps for a given asset
export const getTotalProtocolFeeForAsset = (quote: TradeQuote): Record<AssetId, ProtocolFee> =>
  quote.steps.reduce<Record<AssetId, ProtocolFee>>((acc, step) => {
    return Object.entries(step.feeData.protocolFees).reduce<Record<AssetId, ProtocolFee>>(
      (innerAcc, [assetId, protocolFee]) => {
        if (innerAcc[assetId] === undefined) {
          innerAcc[assetId] = protocolFee
          return innerAcc
        }

        innerAcc[assetId].amountCryptoBaseUnit = bn(innerAcc[assetId].amountCryptoBaseUnit)
          .plus(protocolFee.amountCryptoBaseUnit)
          .toString()
        return innerAcc
      },
      acc,
    )
  }, {})

const getTotalProtocolFeesUsdPrecision = (quote: TradeQuote): BigNumber => {
  const cryptoMarketDataById = selectCryptoMarketData(store.getState())
  return quote.steps.reduce(
    (acc, step) =>
      acc.plus(
        sumProtocolFeesToDenom({
          cryptoMarketDataById,
          protocolFees: step.feeData.protocolFees,
          outputExponent: 0,
          outputAssetPriceUsd: '1',
        }),
      ),
    bn(0),
  )
}

export const getInputOutputRatioFromQuote = ({
  quote,
  swapperName,
}: {
  quote: TradeQuote
  swapperName: SwapperName
}): number => {
  const totalProtocolFeeUsdPrecision = getTotalProtocolFeesUsdPrecision(quote)
  const totalNetworkFeeUsdPrecision = getTotalNetworkFeeUsdPrecision(quote)
  const { sellAmountBeforeFeesCryptoBaseUnit, sellAsset } = quote.steps[0]
  const { buyAsset } = quote.steps[quote.steps.length - 1]

  const {
    netReceiveAmountCryptoBaseUnit,
    buySideNetworkFeeCryptoBaseUnit,
    buySideProtocolFeeCryptoBaseUnit,
  } = getReceiveSideAmountsCryptoBaseUnit({
    quote,
    swapperName,
  })

  const netReceiveAmountUsdPrecision = convertCryptoBaseUnitToUsdPrecision(
    buyAsset,
    netReceiveAmountCryptoBaseUnit,
  )

  const buySideNetworkFeeUsdPrecision = convertCryptoBaseUnitToUsdPrecision(
    buyAsset,
    buySideNetworkFeeCryptoBaseUnit,
  )

  const buySideProtocolFeeUsdPrecision = convertCryptoBaseUnitToUsdPrecision(
    buyAsset,
    buySideProtocolFeeCryptoBaseUnit,
  )

  const sellAmountCryptoBaseUnit = convertCryptoBaseUnitToUsdPrecision(
    sellAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
  )

  const sellSideNetworkFeeUsdPrecision = totalNetworkFeeUsdPrecision.minus(
    buySideNetworkFeeUsdPrecision,
  )
  const sellSideProtocolFeeUsdPrecision = totalProtocolFeeUsdPrecision.minus(
    buySideProtocolFeeUsdPrecision,
  )

  const netSendAmountUsdPrecision = sellAmountCryptoBaseUnit
    .plus(sellSideNetworkFeeUsdPrecision)
    .plus(sellSideProtocolFeeUsdPrecision)

  return netSendAmountUsdPrecision.div(netReceiveAmountUsdPrecision).toNumber()
}
