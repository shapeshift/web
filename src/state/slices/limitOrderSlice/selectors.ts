import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'

import { selectAssetById, selectMarketDataUsd, selectUserCurrencyToUsdRate } from '../selectors'

const selectLimitOrderSlice = (state: ReduxState) => state.limitOrderSlice

export const selectActiveQuote = createSelector(
  selectLimitOrderSlice,
  limitOrderSlice => limitOrderSlice.activeQuote,
)

export const selectActiveQuoteSellAsset = (state: ReduxState) => {
  const sellAssetId = state.limitOrderSlice.activeQuote?.params.sellAssetId
  return sellAssetId ? selectAssetById(state, sellAssetId) : undefined
}

export const selectActiveQuoteBuyAsset = (state: ReduxState) => {
  const buyAssetId = state.limitOrderSlice.activeQuote?.params.buyAssetId
  return buyAssetId ? selectAssetById(state, buyAssetId) : undefined
}

export const selectActiveQuoteSellAmountCryptoPrecision = createSelector(
  selectActiveQuote,
  selectActiveQuoteSellAsset,
  (activeQuote, sellAsset) => {
    if (!activeQuote || !sellAsset) return '0'
    const { precision } = sellAsset
    return fromBaseUnit(activeQuote.response.quote.sellAmount, precision)
  },
)

export const selectActiveQuoteBuyAmountCryptoPrecision = createSelector(
  selectActiveQuote,
  selectActiveQuoteBuyAsset,
  (activeQuote, buyAsset) => {
    if (!activeQuote || !buyAsset) return '0'
    const { precision } = buyAsset
    return fromBaseUnit(activeQuote.response.quote.buyAmount, precision)
  },
)

export const selectActiveQuoteSellAssetUserCurrencyRate = createSelector(
  selectActiveQuoteSellAsset,
  selectMarketDataUsd,
  selectUserCurrencyToUsdRate,
  (asset, marketDataUsd, userCurrencyToUsdRate) => {
    const usdRate = marketDataUsd[asset?.assetId ?? '']?.price
    return bnOrZero(usdRate).times(userCurrencyToUsdRate).toString()
  },
)

export const selectActiveQuoteBuyAssetUserCurrencyRate = createSelector(
  selectActiveQuoteBuyAsset,
  selectMarketDataUsd,
  selectUserCurrencyToUsdRate,
  (asset, marketDataUsd, userCurrencyToUsdRate) => {
    const usdRate = marketDataUsd[asset?.assetId ?? '']?.price
    return bnOrZero(usdRate).times(userCurrencyToUsdRate).toString()
  },
)

export const selectActiveQuoteSellAmountUserCurrency = createSelector(
  selectActiveQuoteSellAmountCryptoPrecision,
  selectActiveQuoteSellAssetUserCurrencyRate,
  (amountCryptoPrecision, userCurrencyRate) => {
    return bn(amountCryptoPrecision).times(userCurrencyRate).toString()
  },
)

export const selectActiveQuoteBuyAmountUserCurrency = createSelector(
  selectActiveQuoteBuyAmountCryptoPrecision,
  selectActiveQuoteBuyAssetUserCurrencyRate,
  (amountCryptoPrecision, userCurrencyRate) => {
    return bn(amountCryptoPrecision).times(userCurrencyRate).toString()
  },
)
