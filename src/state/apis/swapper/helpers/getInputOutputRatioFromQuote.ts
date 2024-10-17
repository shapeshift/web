import type { AssetId } from '@shapeshiftoss/caip'
import type { TradeRate } from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  type SupportedTradeQuoteStepIndex,
  type SwapperName,
  type TradeQuote,
} from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataUsd, selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

const getHopTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate = (
  state: ReduxState,
  tradeQuoteStep: TradeQuote['steps'][number],
  getFeeAssetRate: (feeAssetId: AssetId) => string,
): BigNumber => {
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
  quote: TradeQuote | TradeRate,
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

/**
 * Computes the total network fee across all hops
 * @param state
 * @param quote The trade quote
 * @returns The total network fee across all hops in USD precision
 */
const _getTotalNetworkFeeUsdPrecision = (
  state: ReduxState,
  quote: TradeQuote | TradeRate,
): BigNumber => {
  const marketDataUsd = selectMarketDataUsd(state)

  const getFeeAssetUsdRate = (feeAssetId: AssetId) => {
    const feeAsset = selectFeeAssetById(state, feeAssetId)
    if (feeAsset === undefined) throw Error(`missing fee asset for assetId ${feeAssetId}`)
    const feeAssetMarketData = marketDataUsd[feeAsset.assetId]
    if (feeAssetMarketData === undefined) throw Error(`missing fee asset for assetId ${feeAssetId}`)
    return feeAssetMarketData.price
  }

  return getTotalNetworkFeeFiatPrecisionWithGetFeeAssetRate(state, quote, getFeeAssetUsdRate)
}

const _convertCryptoBaseUnitToUsdPrecision = (
  state: ReduxState,
  asset: Asset,
  amountCryptoBaseUnit: BigNumber.Value,
): BigNumber => {
  const usdRate = selectUsdRateByAssetId(state, asset.assetId)
  // TODO(gomes): revert me once we have a Portals market-data provider, this allows us to get quotes despite missing market data
  // if (usdRate === undefined) throw Error(`missing usd rate for assetId ${asset.assetId}`)
  return bnOrZero(fromBaseUnit(amountCryptoBaseUnit, asset.precision)).times(usdRate ?? '0')
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
}: {
  state: ReduxState
  quote: TradeQuote | TradeRate
  swapperName: SwapperName
}): number => {
  // A quote always has a first step
  const firstStep = getHopByIndex(quote, 0)!
  const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = firstStep
  const lastStepIndex = (quote.steps.length - 1) as SupportedTradeQuoteStepIndex
  // A quote always has a last step since it always has a first
  const lastStep = getHopByIndex(quote, lastStepIndex)!
  const { buyAsset, buyAmountAfterFeesCryptoBaseUnit: netReceiveAmountCryptoBaseUnit } = lastStep

  // If we are trading custom assets we might not have USD rates, so we cannot determine a ratio
  const hasSellAssetUsdRate = selectUsdRateByAssetId(state, sellAsset.assetId) !== undefined
  const hasBuyAssetUsdRate = selectUsdRateByAssetId(state, buyAsset.assetId) !== undefined
  if (!hasSellAssetUsdRate || !hasBuyAssetUsdRate) return 0

  // TODO: implement this when we do multi-hop
  const buySideNetworkFeeCryptoBaseUnit = bn(0)

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

  const sellAmountCryptoBaseUnit = _convertCryptoBaseUnitToUsdPrecision(
    state,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  const totalNetworkFeeUsdPrecision = _getTotalNetworkFeeUsdPrecision(state, quote)

  const sellSideNetworkFeeUsdPrecision = totalNetworkFeeUsdPrecision.minus(
    buySideNetworkFeeUsdPrecision,
  )

  const netSendAmountUsdPrecision = sellAmountCryptoBaseUnit.plus(sellSideNetworkFeeUsdPrecision)

  return netReceiveAmountUsdPrecision.div(netSendAmountUsdPrecision).toNumber()
}
