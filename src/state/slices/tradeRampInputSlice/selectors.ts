import { createSelector } from '@reduxjs/toolkit'

import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { TradeRampInputState } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'

// Shared selectors from the base trade input slice that handle common functionality like input
// assets, rates, and slippage preferences
export const {
  selectInputBuyAsset,
  selectInputSellAsset,
  selectInputBuyAssetUserCurrencyRate,
  selectSellAccountId,
  selectBuyAccountId,
  selectInputSellAmountCryptoBaseUnit,
  selectManualReceiveAddress,
  selectIsManualReceiveAddressValidating,
  selectIsManualReceiveAddressEditing,
  selectIsManualReceiveAddressValid,
  selectInputSellAmountUsd,
  selectInputSellAmountUserCurrency,
  selectSellAssetBalanceCryptoBaseUnit,
  selectIsInputtingFiatSellAmount,
  selectInputSellAmountCryptoPrecision,
  selectSelectedSellAssetChainId,
  selectSelectedBuyAssetChainId,
  ...privateSelectors
} = createTradeInputBaseSelectors<TradeRampInputState>('tradeRampInput')

const { selectBaseSlice } = privateSelectors

export const selectBuyFiatCurrency = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.buyFiatCurrency,
)

export const selectSellFiatCurrency = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.sellFiatCurrency,
)

export const selectSellFiatAmount = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.sellFiatAmount,
)

export const selectSelectedBuyFiatRampQuote = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.selectedBuyFiatRampQuote,
)

export const selectSelectedSellFiatRampQuote = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.selectedSellFiatRampQuote,
)

export const selectFiatBuyAmount = createSelector(
  [selectSelectedBuyFiatRampQuote, selectInputSellAmountCryptoPrecision],
  (selectedQuote, sellAmountCryptoPrecision) => {
    if (!selectedQuote || !selectedQuote.rate) return '0'

    const rate = bnOrZero(selectedQuote.rate)
    const sellAmount = bnOrZero(sellAmountCryptoPrecision)

    return sellAmount.times(rate).toString()
  },
)

export const selectCryptoBuyAmount = createSelector(
  [selectSelectedBuyFiatRampQuote, selectSellFiatAmount],
  (selectedQuote, sellFiatAmount) => {
    if (!selectedQuote || !selectedQuote.rate) return '0'

    const rate = bnOrZero(selectedQuote.rate)
    const sellFiatAmountBN = bnOrZero(sellFiatAmount)

    return sellFiatAmountBN.div(rate).toString()
  },
)

export const selectHasUserEnteredAmount = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectSellFiatAmount,
  (sellAmountCryptoPrecision, sellFiatAmount) =>
    bnOrZero(sellAmountCryptoPrecision).gt(0) || bnOrZero(sellFiatAmount).gt(0),
)
