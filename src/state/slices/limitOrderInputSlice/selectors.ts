import { bn } from '@shapeshiftoss/utils'
import { createSelector } from 'reselect'

import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'
import { PriceDirection } from './constants'
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

export const selectLimitPriceDirection = createSelector(
  selectBaseSlice,
  baseSlice => baseSlice.limitPriceDirection,
)

export const selectLimitPrice = createSelector(selectBaseSlice, baseSlice => baseSlice.limitPrice)
export const selectLimitPriceBuyAsset = createSelector(
  selectLimitPrice,
  selectLimitPriceDirection,
  (limitPrice, limitPriceDirection) => {
    return limitPriceDirection === PriceDirection.BuyAssetDenomination
      ? limitPrice
      : bn(1).div(limitPrice).toFixed()
  },
)

export const selectExpiry = createSelector(selectBaseSlice, baseSlice => baseSlice.expiry)

// This is the buy amount based on the quote + user input.
export const selectBuyAmountCryptoBaseUnit = createSelector(
  selectInputSellAmountCryptoBaseUnit,
  selectLimitPriceBuyAsset,
  (inputSellAmountCryptoBaseUnit, limitPriceBuyAsset) => {
    return bn(inputSellAmountCryptoBaseUnit).times(limitPriceBuyAsset).toFixed(0)
  },
)
