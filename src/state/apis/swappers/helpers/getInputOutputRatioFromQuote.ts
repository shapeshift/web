import type { AssetId } from '@shapeshiftoss/caip'
import { cosmosChainId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { TradeQuote } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import type { ReduxState } from 'state/reducer'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectCryptoMarketData,
  selectUsdRateByAssetId,
} from 'state/slices/marketDataSlice/selectors'

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
  const firstStep = quote.steps[0]
  const lastStep = quote.steps[quote.steps.length - 1]
  const slippageDecimalPercentage =
    quote.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(swapperName)
  const rate = quote.rate

  const buyAmountCryptoBaseUnit = bn(lastStep.buyAmountBeforeFeesCryptoBaseUnit)
  const slippageAmountCryptoBaseUnit = buyAmountCryptoBaseUnit.times(slippageDecimalPercentage)
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
  // Network fee represented as protocol fee for Osmosis swaps
  const buySideNetworkFeeCryptoBaseUnit =
    swapperName === SwapperName.Osmosis
      ? (() => {
          const isAtomOsmo = firstStep.sellAsset.chainId === cosmosChainId

          // Subtract ATOM fees converted to OSMO for ATOM -> OSMO
          if (isAtomOsmo) {
            const otherDenomFee = lastStep.feeData.protocolFees[firstStep.sellAsset.assetId]
            if (!otherDenomFee) return bn(0)
            return bnOrZero(otherDenomFee.amountCryptoBaseUnit).times(rate)
          }

          const firstHopNetworkFee = firstStep.feeData.networkFeeCryptoBaseUnit
          // Subtract the first-hop network fees for OSMO -> ATOM, which aren't automagically subtracted in the multi-hop abstraction
          return bnOrZero(firstHopNetworkFee)
        })()
      : bn(0)
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
  const totalNetworkFeeUsdPrecision = _getTotalNetworkFeeUsdPrecision(state, quote)
  const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = quote.steps[0]
  const { buyAsset } = quote.steps[quote.steps.length - 1]

  const { netReceiveAmountCryptoBaseUnit, buySideNetworkFeeCryptoBaseUnit } =
    _getReceiveSideAmountsCryptoBaseUnit({
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

  const sellAmountCryptoBaseUnit = _convertCryptoBaseUnitToUsdPrecision(
    state,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  const sellSideNetworkFeeUsdPrecision = totalNetworkFeeUsdPrecision.minus(
    buySideNetworkFeeUsdPrecision,
  )

  const netSendAmountUsdPrecision = sellAmountCryptoBaseUnit.plus(sellSideNetworkFeeUsdPrecision)

  return netReceiveAmountUsdPrecision.div(netSendAmountUsdPrecision).toNumber()
}
