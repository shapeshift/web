import { bn, convertPrecision, fromBaseUnit } from '@shapeshiftoss/utils'
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

// This is the buy amount based on the user inputted sell amount and the limit price.
export const selectBuyAmountCryptoBaseUnit = createSelector(
  selectInputSellAmountCryptoBaseUnit,
  selectLimitPrice,
  selectInputSellAsset,
  selectInputBuyAsset,
  (inputSellAmountCryptoBaseUnit, limitPrice, sellAsset, buyAsset) => {
    // NOTE: Arithmetic MUST be in CryptoBaseUnit to avoid precision loss converting back and forth.

    // The naming here is weird, but we're trying to convey the fact the buy amount is denoted in
    // the base units of the sell asset.
    const buyAmountSellAssetBaseUnit = bn(inputSellAmountCryptoBaseUnit).times(
      limitPrice.buyAssetDenomination,
    )

    // Convert the precision to the buy asset precision.
    return convertPrecision({
      value: buyAmountSellAssetBaseUnit,
      inputExponent: sellAsset.precision,
      outputExponent: buyAsset.precision,
    }).toFixed(0)
  },
)

export const selectBuyAmountCryptoPrecision = createSelector(
  selectBuyAmountCryptoBaseUnit,
  selectInputBuyAsset,
  (buyAmountCryptoBaseUnit, buyAsset) => fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset.precision),
)

export const selectBuyAmountUserCurrency = createSelector(
  selectBuyAmountCryptoPrecision,
  selectInputBuyAssetUserCurrencyRate,
  (buyAmountCryptoPrecision, buyAssetUserCurrencyRate) => {
    return bn(buyAmountCryptoPrecision)
      .times(buyAssetUserCurrencyRate ?? '0')
      .toFixed(2)
  },
)
