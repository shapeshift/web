import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { createSelector } from 'reselect'

import { getFeeAssetByAssetId } from '../assetsSlice/utils'
import { PriceDirection } from '../limitOrderInputSlice/constants'
import { selectAssets, selectMarketDataUsd, selectUserCurrencyToUsdRate } from '../selectors'
import { calcLimitPriceTargetAsset } from './helpers'
import { limitOrderSlice } from './limitOrderSlice'
import type { LimitOrderSubmissionMetadata } from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectQuoteIdParamFromRequiredFilter } from '@/state/selectors'

export const selectActiveQuoteId = createSelector(
  limitOrderSlice.selectors.selectActiveQuote,
  activeQuote => activeQuote?.response.id,
)

export const selectActiveQuoteExpirationTimestamp = createSelector(
  limitOrderSlice.selectors.selectActiveQuote,
  activeQuote => activeQuote?.params.validTo,
)

const selectActiveQuoteSellAssetId = createSelector(
  limitOrderSlice.selectors.selectActiveQuote,
  activeQuote => activeQuote?.params.sellAssetId,
)

export const selectActiveQuoteSellAsset = createSelector(
  selectActiveQuoteSellAssetId,
  selectAssets,
  (sellAssetId, assetsById) => assetsById[sellAssetId ?? ''],
)

const selectActiveQuoteBuyAssetId = createSelector(
  limitOrderSlice.selectors.selectActiveQuote,
  activeQuote => activeQuote?.params.buyAssetId,
)

export const selectActiveQuoteBuyAsset = createSelector(
  selectActiveQuoteBuyAssetId,
  selectAssets,
  (buyAssetId, assetsById) => assetsById[buyAssetId ?? ''],
)

export const selectActiveQuoteFeeAsset = createSelector(
  selectActiveQuoteSellAssetId,
  selectAssets,
  (sellAssetId, assetsById) => getFeeAssetByAssetId(assetsById, sellAssetId),
)

export const selectActiveQuoteSellAmountCryptoBaseUnit = createSelector(
  limitOrderSlice.selectors.selectActiveQuote,
  activeQuote => {
    if (!activeQuote) return '0'

    // DANGER: DO NOT use the values in the quote response - the quote amounts assume spot trade and
    // will not match the user-inputted limit price. Doing so will discard the user input limit and
    // do a spot trade.
    return activeQuote.params.sellAmountCryptoBaseUnit
  },
)

export const selectActiveQuoteBuyAmountCryptoBaseUnit = createSelector(
  limitOrderSlice.selectors.selectActiveQuote,
  activeQuote => {
    if (!activeQuote) return '0'

    // DANGER: DO NOT use the values in the quote response - the quote amounts assume spot trade and
    // will not match the user-inputted limit price. Doing so will discard the user input limit and
    // do a spot trade.
    return activeQuote.params.buyAmountCryptoBaseUnit
  },
)

export const selectActiveQuoteSellAmountCryptoPrecision = createSelector(
  selectActiveQuoteSellAmountCryptoBaseUnit,
  selectActiveQuoteSellAsset,
  (sellAmountCryptoBaseUnit, asset) => {
    if (!asset) return '0'

    return fromBaseUnit(sellAmountCryptoBaseUnit, asset.precision)
  },
)

export const selectActiveQuoteBuyAmountCryptoPrecision = createSelector(
  selectActiveQuoteBuyAmountCryptoBaseUnit,
  selectActiveQuoteBuyAsset,
  (buyAmountCryptoBaseUnit, asset) => {
    if (!asset) return '0'

    return fromBaseUnit(buyAmountCryptoBaseUnit, asset.precision)
  },
)

export const selectActiveQuoteNetworkFeeCryptoPrecision = createSelector(
  limitOrderSlice.selectors.selectActiveQuote,
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

export const selectActiveQuoteFeeAssetRateUserCurrency = createSelector(
  selectActiveQuoteFeeAsset,
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
  selectActiveQuoteFeeAssetRateUserCurrency,
  (amountCryptoPrecision, userCurrencyRate) => {
    return bn(amountCryptoPrecision).times(userCurrencyRate).toFixed()
  },
)

export const selectActiveQuoteLimitPrice = createSelector(
  selectActiveQuoteSellAmountCryptoBaseUnit,
  selectActiveQuoteBuyAmountCryptoBaseUnit,
  selectActiveQuoteSellAsset,
  selectActiveQuoteBuyAsset,
  (sellAmountCryptoBaseUnit, buyAmountCryptoBaseUnit, sellAsset, buyAsset) => {
    if (!sellAsset || !buyAsset) return

    const marketPriceBuyAsset = calcLimitPriceTargetAsset({
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    return {
      [PriceDirection.BuyAssetDenomination]: marketPriceBuyAsset,
      [PriceDirection.SellAssetDenomination]: bn(1).div(marketPriceBuyAsset).toFixed(),
    }
  },
)

export const selectConfirmedLimitOrder = createSelector(
  limitOrderSlice.selectSlice,
  selectQuoteIdParamFromRequiredFilter,
  (limitOrderSlice, quoteId) => limitOrderSlice.confirmedLimitOrder[quoteId],
)

export const selectLimitOrderSubmissionMetadata = createDeepEqualOutputSelector(
  limitOrderSlice.selectSlice,
  selectQuoteIdParamFromRequiredFilter,
  (limitOrders, quoteId): LimitOrderSubmissionMetadata | undefined => {
    return limitOrders.orderSubmission[quoteId]
  },
)
