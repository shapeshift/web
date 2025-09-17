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
  selectHasUserEnteredAmount,
  selectInputSellAmountCryptoPrecision,
  selectSelectedSellAssetChainId,
  selectSelectedBuyAssetChainId,
  ...privateSelectors
} = createTradeInputBaseSelectors<TradeRampInputState>('tradeRampInput')

const { selectBaseSlice } = privateSelectors

export const selectBuyFiatAsset = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.buyFiatAsset,
)

export const selectSellFiatAsset = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.sellFiatAsset,
)

export const selectSellFiatAmount = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.sellFiatAmount,
)

export const selectSelectedFiatRampQuote = createSelector(
  selectBaseSlice,
  tradeRampInput => tradeRampInput.selectedFiatRampQuote,
)

// Calculate buy amount based on selected quote rate and direction
export const selectCalculatedBuyAmount = createSelector(
  [selectSelectedFiatRampQuote, selectInputSellAmountCryptoPrecision, selectSellFiatAmount],
  (selectedQuote, sellAmountCryptoPrecision, sellFiatAmount) => {
    if (!selectedQuote || !selectedQuote.rate) return '0'

    const rate = bnOrZero(selectedQuote.rate)
    const sellAmount = bnOrZero(sellAmountCryptoPrecision)
    const sellFiatAmountBN = bnOrZero(sellFiatAmount)

    // For buy direction: buy amount = fiat amount / rate
    // For sell direction: buy amount = crypto amount * rate
    // We need to determine direction based on which amount is being used
    if (sellFiatAmountBN.gt(0)) {
      // User is inputting fiat amount (buy direction)
      return sellFiatAmountBN.div(rate).toString()
    } else if (sellAmount.gt(0)) {
      // User is inputting crypto amount (sell direction)
      return sellAmount.times(rate).toString()
    }

    return '0'
  },
)
