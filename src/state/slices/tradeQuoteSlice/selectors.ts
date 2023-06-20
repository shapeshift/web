import { createSelector } from '@reduxjs/toolkit'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  getHopTotalNetworkFeeFiatPrecision,
  getHopTotalProtocolFeesFiatPrecision,
  getNetReceiveAmountCryptoPrecision,
  getTotalNetworkFeeFiatPrecision,
  getTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/helpers'

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

// TODO(apotheosis): Cache based on quote ID
export const selectSelectedQuote = createDeepEqualOutputSelector(
  selectTradeQuoteSlice,
  swappers => swappers.quote,
)

export const selectSelectedSwapperName = createSelector(
  selectTradeQuoteSlice,
  swappers => swappers.swapperName,
)

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = createSelector(
  selectSelectedSwapperName,
  selectedSwapperName => {
    if (selectedSwapperName === undefined) return undefined

    switch (selectedSwapperName) {
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
        assertUnreachable(selectedSwapperName)
    }
  },
)

export const selectHopTotalProtocolFeesFiatPrecision = createSelector(
  selectSelectedQuote,
  (_state: ReduxState, step: 0 | 1) => step,
  (quote, step) =>
    quote && quote.steps[step]
      ? getHopTotalProtocolFeesFiatPrecision(quote.steps[step])
      : undefined,
)

export const selectHopTotalNetworkFeeFiatPrecision = createSelector(
  selectSelectedQuote,
  (_state: ReduxState, step: 0 | 1) => step,
  (quote, step) =>
    quote && quote.steps[step] ? getHopTotalNetworkFeeFiatPrecision(quote.steps[step]) : undefined,
)

export const selectNetReceiveAmountCryptoPrecision = createSelector(
  selectSelectedQuote,
  selectSelectedSwapperName,
  (quote, swapperName) =>
    quote && swapperName ? getNetReceiveAmountCryptoPrecision({ quote, swapperName }) : undefined,
)

export const selectTotalNetworkFeeFiatPrecision = createSelector(selectSelectedQuote, quote =>
  quote ? getTotalNetworkFeeFiatPrecision(quote) : undefined,
)

export const selectTotalProtocolFeeByAsset = createDeepEqualOutputSelector(
  selectSelectedQuote,
  quote => (quote ? getTotalProtocolFeeByAsset(quote) : undefined),
)

export const selectFirstHop = createSelector(selectSelectedQuote, quote =>
  quote ? quote.steps[0] : undefined,
)

export const selectLastHop = createSelector(selectSelectedQuote, quote =>
  quote ? quote.steps[quote.steps.length - 1] : undefined,
)

export const selectFirstHopSellAsset = createSelector(selectFirstHop, firstHop =>
  firstHop ? firstHop.sellAsset : undefined,
)

export const selectFirstHopBuyAsset = createSelector(selectFirstHop, firstHop =>
  firstHop ? firstHop.buyAsset : undefined,
)

export const selectLastHopSellAsset = createSelector(selectLastHop, lastHop =>
  lastHop ? lastHop.sellAsset : undefined,
)

export const selectLastHopBuyAsset = createSelector(selectLastHop, lastHop =>
  lastHop ? lastHop.buyAsset : undefined,
)

export const selectSellAmountCryptoBaseUnit = createSelector(selectFirstHop, firstHop =>
  firstHop ? firstHop.sellAmountBeforeFeesCryptoBaseUnit : undefined,
)

// const selectFeeAssetByIdSelector = (state: ReduxState) => selectFeeAssetById(state)

export const selectSellAmountCryptoPrecision = createSelector(
  [selectFirstHopSellAsset, selectSellAmountCryptoBaseUnit],
  (firstHopSellAsset, sellAmountCryptoBaseUnit) =>
    firstHopSellAsset
      ? fromBaseUnit(bnOrZero(sellAmountCryptoBaseUnit), firstHopSellAsset?.precision)
      : undefined,
)

export const selectFirstHopSellFeeAsset = createSelector(
  (state: ReduxState) => selectFeeAssetById(state, selectFirstHopSellAsset(state)?.assetId ?? ''),
  firstHopSellFeeAsset => firstHopSellFeeAsset,
)

export const selectLastHopSellFeeAsset = createSelector(
  (state: ReduxState) => selectFeeAssetById(state, selectLastHopSellAsset(state)?.assetId ?? ''),
  lastHopSellFeeAsset => lastHopSellFeeAsset,
)

// when trading from fee asset, the value of TX in fee asset is deducted
export const selectFirstHopTradeDeductionCryptoPrecision = createSelector(
  selectFirstHopSellFeeAsset,
  selectFirstHopSellAsset,
  selectSellAmountCryptoPrecision,
  (firstHopSellFeeAsset, firstHopSellAsset, sellAmountCryptoPrecision) =>
    firstHopSellFeeAsset?.assetId === firstHopSellAsset?.assetId
      ? bnOrZero(sellAmountCryptoPrecision)
      : bn(0),
)

// TODO(woodenfurniture): update swappers to specify this as with protocol fees
export const selectNetworkFeeRequiresBalance = createSelector(
  selectSelectedSwapperName,
  (swapperName): boolean => swapperName === SwapperName.CowSwap,
)

export const selectFirstHopNetworkFeeCryptoBaseUnit = createSelector(
  selectFirstHop,
  firstHop => firstHop?.feeData.networkFeeCryptoBaseUnit,
)

export const selectLastHopNetworkFeeCryptoBaseUnit = createSelector(
  selectLastHop,
  lastHop => lastHop?.feeData.networkFeeCryptoBaseUnit,
)
export const selectFirstHopNetworkFeeCryptoPrecision = createSelector(
  selectNetworkFeeRequiresBalance,
  selectFirstHopSellFeeAsset,
  selectFirstHopNetworkFeeCryptoBaseUnit,
  (networkFeeRequiresBalance, firstHopSellFeeAsset, firstHopNetworkFeeCryptoBaseUnit) =>
    networkFeeRequiresBalance && firstHopSellFeeAsset
      ? fromBaseUnit(bnOrZero(firstHopNetworkFeeCryptoBaseUnit), firstHopSellFeeAsset.precision)
      : bn(0),
)

export const selectLastHopNetworkFeeCryptoPrecision = createSelector(
  selectNetworkFeeRequiresBalance,
  selectLastHopSellFeeAsset,
  selectLastHopNetworkFeeCryptoBaseUnit,
  (networkFeeRequiresBalance, lastHopSellFeeAsset, lastHopNetworkFeeCryptoBaseUnit) =>
    networkFeeRequiresBalance && lastHopSellFeeAsset
      ? fromBaseUnit(bnOrZero(lastHopNetworkFeeCryptoBaseUnit), lastHopSellFeeAsset.precision)
      : bn(0),
)
