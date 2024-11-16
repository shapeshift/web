import { createSelector } from 'reselect'

import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'
import type { LimitOrderInputState } from './limitOrderInputSlice'

// Shared selectors from the base trade input slice that handle common functionality like input
// assets, rates, and slippage preferences
export const {
  selectInputBuyAsset,
  selectInputSellAsset,
  selectInputSellAssetUsdRate,
  selectInputBuyAssetUsdRate,
  selectInputSellAssetUserCurrencyRate,
  selectInputBuyAssetUserCurrencyRate,
  selectUserSlippagePercentage,
  selectUserSlippagePercentageDecimal,
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
  ...privateSelectors
} = createTradeInputBaseSelectors<LimitOrderInputState>('limitOrderInput')

const { selectBaseSlice } = privateSelectors

export const selectLimitPriceBuyAsset = createSelector(
  selectBaseSlice,
  baseSlice => baseSlice.limitPriceBuyAsset,
)

export const selectExpiry = createSelector(selectBaseSlice, baseSlice => baseSlice.expiry)
