import type { QuoteId } from '@shapeshiftoss/types/dist/cowSwap'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'

import { PriceDirection } from '../limitOrderInputSlice/constants'
import {
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataUsd,
  selectUserCurrencyToUsdRate,
} from '../selectors'
import type { LimitOrderState } from './types'

const selectLimitOrderSlice = (state: ReduxState) => state.limitOrderSlice

export const selectActiveQuote = createSelector(
  selectLimitOrderSlice,
  limitOrderSlice => limitOrderSlice.activeQuote,
)

export const selectOrderToCancel = createSelector(
  selectLimitOrderSlice,
  limitOrderSlice => limitOrderSlice.orderToCancel,
)

export const selectActiveQuoteExpirationTimestamp = createSelector(
  selectActiveQuote,
  activeQuote => {
    return activeQuote?.params.validTo
  },
)

export const selectActiveQuoteSellAsset = (state: ReduxState) => {
  const sellAssetId = state.limitOrderSlice.activeQuote?.params.sellAssetId
  return sellAssetId ? selectAssetById(state, sellAssetId) : undefined
}

export const selectActiveQuoteBuyAsset = (state: ReduxState) => {
  const buyAssetId = state.limitOrderSlice.activeQuote?.params.buyAssetId
  return buyAssetId ? selectAssetById(state, buyAssetId) : undefined
}

export const selectActiveQuoteFeeAsset = (state: ReduxState) => {
  const sellAssetId = state.limitOrderSlice.activeQuote?.params.sellAssetId
  return sellAssetId ? selectFeeAssetById(state, sellAssetId) : undefined
}

export const selectActiveQuoteSellAmountCryptoPrecision = createSelector(
  selectActiveQuote,
  selectActiveQuoteSellAsset,
  (activeQuote, asset) => {
    if (!activeQuote || !asset) return '0'
    const { precision } = asset
    return fromBaseUnit(activeQuote.response.quote.sellAmount, precision)
  },
)

export const selectActiveQuoteBuyAmountCryptoPrecision = createSelector(
  selectActiveQuote,
  selectActiveQuoteBuyAsset,
  (activeQuote, asset) => {
    if (!activeQuote || !asset) return '0'
    const { precision } = asset
    // DANGER! DO NOT use the quote buy amount `activeQuote.response.quote.buyAmount`
    // doing so will discard the user input limit and do a spot trade.
    return fromBaseUnit(activeQuote.params.buyAmountCryptoBaseUnit, precision)
  },
)

export const selectActiveQuoteNetworkFeeCryptoPrecision = createSelector(
  selectActiveQuote,
  selectActiveQuoteFeeAsset,
  (activeQuote, asset) => {
    if (!activeQuote || !asset) return '0'
    const { precision } = asset
    // CoW does not cost a network fee to submit, but the calcs are implemented as though they did
    // in case we ever wire them in for a different protocol in the future.
    const networkFee = '0'
    return fromBaseUnit(networkFee, precision)
  },
)

export const selectActiveQuoteSellAssetRateUserCurrency = createSelector(
  selectActiveQuoteSellAsset,
  selectMarketDataUsd,
  selectUserCurrencyToUsdRate,
  (asset, marketDataUsd, userCurrencyToUsdRate) => {
    const usdRate = marketDataUsd[asset?.assetId ?? '']?.price
    return bnOrZero(usdRate).times(userCurrencyToUsdRate).toFixed()
  },
)

export const selectActiveQuoteBuyAssetRateUserCurrency = createSelector(
  selectActiveQuoteBuyAsset,
  selectMarketDataUsd,
  selectUserCurrencyToUsdRate,
  (asset, marketDataUsd, userCurrencyToUsdRate) => {
    const usdRate = marketDataUsd[asset?.assetId ?? '']?.price
    return bnOrZero(usdRate).times(userCurrencyToUsdRate).toFixed()
  },
)

export const selectActiveQuoteSellAmountUserCurrency = createSelector(
  selectActiveQuoteSellAmountCryptoPrecision,
  selectActiveQuoteSellAssetRateUserCurrency,
  (amountCryptoPrecision, userCurrencyRate) => {
    return bn(amountCryptoPrecision).times(userCurrencyRate).toFixed()
  },
)

export const selectActiveQuoteBuyAmountUserCurrency = createSelector(
  selectActiveQuoteBuyAmountCryptoPrecision,
  selectActiveQuoteBuyAssetRateUserCurrency,
  (amountCryptoPrecision, userCurrencyRate) => {
    return bn(amountCryptoPrecision).times(userCurrencyRate).toFixed()
  },
)

export const selectActiveQuoteNetworkFeeUserCurrency = createSelector(
  selectActiveQuoteNetworkFeeCryptoPrecision,
  selectActiveQuoteBuyAssetRateUserCurrency,
  (amountCryptoPrecision, userCurrencyRate) => {
    return bn(amountCryptoPrecision).times(userCurrencyRate).toFixed()
  },
)

export const selectActiveQuoteLimitPrice = createSelector(
  selectActiveQuoteSellAmountCryptoPrecision,
  selectActiveQuoteBuyAmountCryptoPrecision,
  (sellAmountCryptoPrecision, buyAmountCryptoPrecision) => {
    return {
      [PriceDirection.SellAssetDenomination]: bn(sellAmountCryptoPrecision)
        .div(buyAmountCryptoPrecision)
        .toFixed(),
      [PriceDirection.BuyAssetDenomination]: bn(buyAmountCryptoPrecision)
        .div(sellAmountCryptoPrecision)
        .toFixed(),
    }
  },
)

export const selectConfirmedLimitOrder = createSelector(
  selectLimitOrderSlice,
  (_state: ReduxState, quoteId: QuoteId) => quoteId,
  (limitOrderSlice: LimitOrderState, quoteId: QuoteId) =>
    limitOrderSlice.confirmedLimitOrder[quoteId],
)
