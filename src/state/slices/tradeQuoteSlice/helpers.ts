import type { AssetId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, TradeQuote } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectCryptoMarketData,
  selectFiatToUsdRate,
  selectMarketDataByFilter,
} from 'state/slices/marketDataSlice/selectors'
import { store } from 'state/store'
import { sumProtocolFeesToDenom } from 'state/zustand/swapperStore/utils'

const getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetFiatRate = (
  tradeQuoteStep: TradeQuote['steps'][number],
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber => {
  // TODO(woodenfurniture): handle osmo swapper crazy network fee logic here
  const feeAsset = selectFeeAssetById(store.getState(), tradeQuoteStep?.sellAsset.assetId)

  if (feeAsset === undefined)
    throw Error(`missing fee asset for assetId ${tradeQuoteStep.sellAsset.assetId}`)

  const feeAssetFiatRate = getFeeAssetRate(feeAsset.assetId)

  const networkFeeCryptoBaseUnit = tradeQuoteStep.feeData.networkFeeCryptoBaseUnit
  const networkFeeFiatPrecision = bnOrZero(
    fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset.precision),
  ).times(feeAssetFiatRate)

  return networkFeeFiatPrecision
}

// NOTE: "Receive side" refers to "last hop AND buy asset AND receive account".
// TODO: we'll need a check to ensure any fees included here impact the final amount received in the
// receive account
const _getReceiveSideAmountsCryptoBaseUnit = ({
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
  const buySideNetworkFeeCryptoBaseUnit = bn(0) // TODO(woodenfurniture): handle osmo swapper crazy network fee logic here
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

const getTotalNetworkFeeFiatPrecisionWithGetFeeAssetFiatRate = (
  quote: TradeQuote,
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber =>
  quote.steps.reduce((acc, step) => {
    const networkFeeFiatPrecision = getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetFiatRate(
      step,
      getFeeAssetRate,
    )
    return acc.plus(networkFeeFiatPrecision)
  }, bn(0))

export const getHopTotalProtocolFeesFiatPrecision = (
  tradeQuoteStep: TradeQuote['steps'][number],
): string => {
  const fiatToUsdRate = selectFiatToUsdRate(store.getState())
  const cryptoMarketDataById = selectCryptoMarketData(store.getState())
  return sumProtocolFeesToDenom({
    cryptoMarketDataById,
    protocolFees: tradeQuoteStep.feeData.protocolFees,
    outputExponent: 0,
    outputAssetPriceUsd: fiatToUsdRate,
  })
}

export const getHopTotalNetworkFeeFiatPrecision = (
  tradeQuoteStep: TradeQuote['steps'][number],
): string => {
  const state = store.getState()
  const getFeeAssetFiatRate = (feeAssetId: AssetId) =>
    selectMarketDataByFilter(state, {
      assetId: feeAssetId,
    }).price
  return getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetFiatRate(
    tradeQuoteStep,
    getFeeAssetFiatRate,
  ).toString()
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
export const getTotalNetworkFeeFiatPrecision = (quote: TradeQuote) => {
  const state = store.getState()
  const getFeeAssetFiatRate = (feeAssetId: AssetId) =>
    selectMarketDataByFilter(state, {
      assetId: feeAssetId,
    }).price

  return getTotalNetworkFeeFiatPrecisionWithGetFeeAssetFiatRate(
    quote,
    getFeeAssetFiatRate,
  ).toString()
}

// TODO(woodenfurniture): this assumes `requiresBalance` is the same for steps for a given asset
export const getTotalProtocolFeeByAsset = (quote: TradeQuote): Record<AssetId, ProtocolFee> =>
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

export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Osmosis:
      return true
    // NOTE: Before enabling cross-account for LIFI and OneInch - we must pass the sending address
    // to the swappers up so allowance checks work. They're currently using the receive address
    // assuming it's the same address as the sending address.
    case SwapperName.LIFI:
    case SwapperName.OneInch:
    case SwapperName.Zrx:
    case SwapperName.CowSwap:
    case SwapperName.Test:
      return false
    default:
      assertUnreachable(swapperName)
  }
}
