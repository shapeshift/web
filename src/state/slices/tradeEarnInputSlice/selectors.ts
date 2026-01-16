import { createSelector } from '@reduxjs/toolkit'

import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'

import type { TradeEarnInputState } from '@/state/slices/tradeEarnInputSlice/tradeEarnInputSlice'

export const {
  selectInputBuyAsset,
  selectInputSellAsset,
  selectInputBuyAssetUserCurrencyRate,
  selectInputSellAssetUserCurrencyRate,
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
  selectHasUserEnteredAmount,
  ...privateSelectors
} = createTradeInputBaseSelectors<TradeEarnInputState>('tradeEarnInput')

const { selectBaseSlice } = privateSelectors

export const selectSelectedYieldId = createSelector(
  selectBaseSlice,
  tradeEarnInput => tradeEarnInput.selectedYieldId,
)
