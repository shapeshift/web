import type { AssetId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { SwapperName, TradeQuote } from 'lib/swapper/api'
import type { ReduxState } from 'state/reducer'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectCryptoMarketData,
  selectUsdRateByAssetId,
} from 'state/slices/marketDataSlice/selectors'
import { sumProtocolFeesToDenom } from 'state/zustand/swapperStore/utils'

const getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate = (
  state: ReduxState,
  tradeQuoteStep: TradeQuote['steps'][number],
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber => {
  // TODO(woodenfurniture): handle osmo swapper crazy network fee logic here
  const feeAsset = selectFeeAssetById(state, tradeQuoteStep?.sellAsset.assetId)

  if (feeAsset === undefined)
    throw Error(`missing fee asset for assetId ${tradeQuoteStep.sellAsset.assetId}`)

  const feeAssetUserCurrencyRate = getFeeAssetRate(feeAsset.assetId)

  const networkFeeCryptoBaseUnit = tradeQuoteStep.feeData.networkFeeCryptoBaseUnit
  const networkFeeFiatPrecision = bnOrZero(
    fromBaseUnit(networkFeeCryptoBaseUnit ?? '0', feeAsset.precision),
  ).times(feeAssetUserCurrencyRate)

  return networkFeeFiatPrecision
}

const getTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate = (
  state: ReduxState,
  quote: TradeQuote,
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber =>
  quote.steps.reduce((acc, step) => {
    const networkFeeFiatPrecision = getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate(
      state,
      step,
      getFeeAssetRate,
    )
    return acc.plus(networkFeeFiatPrecision)
  }, bn(0))

const _getTotalProtocolFeesUsdPrecision = (state: ReduxState, quote: TradeQuote): BigNumber => {
  const cryptoMarketDataById = selectCryptoMarketData(state)
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

/**
 * Computes the total network fee across all hops
 * @param state
 * @param quote The trade quote
 * @returns The total network fee across all hops in USD precision
 */
const _getTotalNetworkFeeUsdPrecision = (state: ReduxState, quote: TradeQuote): BigNumber => {
  const cryptoMarketDataById = selectCryptoMarketData(state)

  const getFeeAssetUsdRate = (feeAssetId: AssetId) => {
    const feeAsset = selectFeeAssetById(state, feeAssetId)
    if (feeAsset === undefined) throw Error(`missing fee asset for assetId ${feeAssetId}`)
    const feeAssetMarketData = cryptoMarketDataById[feeAsset.assetId]
    if (feeAssetMarketData === undefined) throw Error(`missing fee asset for assetId ${feeAssetId}`)
    return feeAssetMarketData.price
  }

  return getTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate(state, quote, getFeeAssetUsdRate)
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

const _convertCryptoBaseUnitToUsdPrecision = (
  state: ReduxState,
  asset: Asset,
  amountCryptoBaseUnit: BigNumber.Value,
): BigNumber => {
  const usdRate = selectUsdRateByAssetId(state, asset.assetId)
  if (usdRate === undefined) throw Error(`missing usd rate for assetId ${asset.assetId}`)
  return bnOrZero(fromBaseUnit(amountCryptoBaseUnit, asset.precision)).times(usdRate)
}

/*
  The ratio is calculated by dividing the total fiat value of the receive amount
  by the total fiat value of the sell amount (including network fees).

  Higher ratios are better.

  E.g. if the fiat value of the sell amount is 100 and the fiat value of the receive amount is 90,
  the ratio is 0.9.

  Negative ratios are possible when the fees exceed the sell amount.
  This is allowed to let us choose 'the best from a bad bunch'.
*/
export const getInputOutputRatioFromQuote = ({
  state,
  quote,
  swapperName,
}: {
  state: ReduxState
  quote: TradeQuote
  swapperName: SwapperName
}): number => {
  const totalProtocolFeeUsdPrecision = _getTotalProtocolFeesUsdPrecision(state, quote)
  const totalNetworkFeeUsdPrecision = _getTotalNetworkFeeUsdPrecision(state, quote)
  const { sellAmountBeforeFeesCryptoBaseUnit, sellAsset } = quote.steps[0]
  const { buyAsset } = quote.steps[quote.steps.length - 1]

  const {
    netReceiveAmountCryptoBaseUnit,
    buySideNetworkFeeCryptoBaseUnit,
    buySideProtocolFeeCryptoBaseUnit,
  } = _getReceiveSideAmountsCryptoBaseUnit({
    quote,
    swapperName,
  })

  const netReceiveAmountUsdPrecision = _convertCryptoBaseUnitToUsdPrecision(
    state,
    buyAsset,
    netReceiveAmountCryptoBaseUnit,
  )

  const buySideNetworkFeeUsdPrecision = _convertCryptoBaseUnitToUsdPrecision(
    state,
    buyAsset,
    buySideNetworkFeeCryptoBaseUnit,
  )

  const buySideProtocolFeeUsdPrecision = _convertCryptoBaseUnitToUsdPrecision(
    state,
    buyAsset,
    buySideProtocolFeeCryptoBaseUnit,
  )

  const sellAmountCryptoBaseUnit = _convertCryptoBaseUnitToUsdPrecision(
    state,
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

  return netReceiveAmountUsdPrecision.div(netSendAmountUsdPrecision).toNumber()
}
