import { bn, toBaseUnit } from '@shapeshiftoss/utils'
import { createSelector } from 'reselect'

import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'
import { getOppositePriceDirection } from './helpers'
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

export const selectLimitPriceOppositeDirection = createSelector(
  selectLimitPriceDirection,
  priceDirection => {
    return getOppositePriceDirection(priceDirection)
  },
)

export const selectLimitPrice = createSelector(selectBaseSlice, baseSlice => baseSlice.limitPrice)

export const selectLimitPriceMode = createSelector(
  selectBaseSlice,
  baseSlice => baseSlice.limitPriceMode,
)

export const selectLimitPriceForSelectedPriceDirection = createSelector(
  selectBaseSlice,
  selectLimitPriceDirection,
  (baseSlice, limitPriceDirection) => baseSlice.limitPrice[limitPriceDirection],
)

export const selectExpiry = createSelector(selectBaseSlice, baseSlice => baseSlice.expiry)

// This is the buy amount based on the quote + user input.
export const selectBuyAmountCryptoBaseUnit = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputBuyAsset,
  selectLimitPrice,
  (inputSellAmountCryptoPrecision, buyAsset, limitPrice) => {
    // Arithmetic MUST be in CryptoPrecision due to differing decimals on various tokens.
    return toBaseUnit(
      bn(inputSellAmountCryptoPrecision).times(limitPrice.buyAssetDenomination),
      buyAsset.precision,
    )
  },
)
