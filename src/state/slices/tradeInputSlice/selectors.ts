import { createSelector } from '@reduxjs/toolkit'
import type { Selector } from 'react-redux'
import { bn } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectWalletAccountIds,
} from '../common-selectors'
import { selectCryptoMarketData, selectUserCurrencyToUsdRate } from '../marketDataSlice/selectors'
import { selectPortfolioAssetAccountBalancesSortedUserCurrency } from '../portfolioSlice/selectors'
import {
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from '../portfolioSlice/utils'

const selectTradeInput = (state: ReduxState) => state.tradeInput

export const selectInputBuyAsset = createDeepEqualOutputSelector(
  selectTradeInput,
  tradeInput => tradeInput.buyAsset,
)

export const selectInputSellAsset = createDeepEqualOutputSelector(
  selectTradeInput,
  tradeInput => tradeInput.sellAsset,
)

export const selectInputSellAssetUsdRate = createSelector(
  selectInputSellAsset,
  selectCryptoMarketData,
  (sellAsset, cryptoMarketDataById) => {
    if (sellAsset === undefined) return
    return cryptoMarketDataById[sellAsset.assetId]?.price
  },
)

export const selectInputBuyAssetUsdRate = createSelector(
  selectInputBuyAsset,
  selectCryptoMarketData,
  (buyAsset, cryptoMarketDataById) => {
    if (buyAsset === undefined) return
    return cryptoMarketDataById[buyAsset.assetId]?.price
  },
)

export const selectInputSellAssetUserCurrencyRate = createSelector(
  selectInputSellAssetUsdRate,
  selectUserCurrencyToUsdRate,
  (sellAssetUsdRate, userCurrencyToUsdRate) => {
    if (sellAssetUsdRate === undefined) return
    return bn(sellAssetUsdRate).times(userCurrencyToUsdRate).toString()
  },
)

export const selectInputBuyAssetUserCurrencyRate = createSelector(
  selectInputBuyAssetUsdRate,
  selectUserCurrencyToUsdRate,
  (buyAssetUsdRate, userCurrencyToUsdRate) => {
    if (buyAssetUsdRate === undefined) return
    return bn(buyAssetUsdRate).times(userCurrencyToUsdRate).toString()
  },
)

export const selectUserSlippagePercentage: Selector<ReduxState, string | undefined> =
  createSelector(selectTradeInput, tradeInput => tradeInput.slippagePreferencePercentage)

// User input comes in as an actual percentage e.g 1 for 1%, so we need to convert it to a decimal e.g 0.01 for 1%
export const selectUserSlippagePercentageDecimal: Selector<ReduxState, string | undefined> =
  createSelector(selectUserSlippagePercentage, slippagePercentage => {
    if (!slippagePercentage) return
    return bn(slippagePercentage).div(100).toString()
  })

// selects the account ID we're selling from for the first hop
export const selectFirstHopSellAccountId = createSelector(
  selectTradeInput,
  selectInputSellAsset,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectWalletAccountIds,
  (tradeInput, sellAsset, accountIdAssetValues, accountIds) => {
    // return the users selection if it exists
    if (tradeInput.sellAssetAccountId) return tradeInput.sellAssetAccountId

    const highestFiatBalanceSellAccountId = getHighestUserCurrencyBalanceAccountByAssetId(
      accountIdAssetValues,
      sellAsset.assetId,
    )
    const firstSellAssetAccountId = getFirstAccountIdByChainId(accountIds, sellAsset.chainId)

    // otherwise return a sane default
    return highestFiatBalanceSellAccountId ?? firstSellAssetAccountId
  },
)

// selects the account ID we're selling from for the other hops
// for posterity, every hop always sells from the same account as the first hop
export const selectSecondHopSellAccountId = selectFirstHopSellAccountId
export const selectLastHopSellAccountId = selectFirstHopSellAccountId

// selects the account ID we're buying into for the last hop
export const selectLastHopBuyAccountId = createSelector(
  selectTradeInput,
  selectInputBuyAsset,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectWalletAccountIds,
  (tradeInput, buyAsset, accountIdAssetValues, accountIds) => {
    // return the users selection if it exists
    if (tradeInput.buyAssetAccountId) return tradeInput.buyAssetAccountId

    const highestFiatBalanceBuyAccountId = getHighestUserCurrencyBalanceAccountByAssetId(
      accountIdAssetValues,
      buyAsset.assetId,
    )
    const firstBuyAssetAccountId = getFirstAccountIdByChainId(accountIds, buyAsset.chainId)

    // otherwise return a sane default
    return highestFiatBalanceBuyAccountId ?? firstBuyAssetAccountId
  },
)

export const selectInputSellAmountCryptoPrecision = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.sellAmountCryptoPrecision,
)

export const selectInputSellAmountCryptoBaseUnit = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  (sellAmountCryptoPrecision, sellAsset) =>
    toBaseUnit(sellAmountCryptoPrecision, sellAsset.precision),
)

export const selectManualReceiveAddress = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddress,
)

export const selectManualReceiveAddressIsValidating = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddressIsValidating,
)

export const selectManualReceiveAddressIsValid = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddressIsValid,
)

export const selectInputSellAmountUsd = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAssetUsdRate,
  (sellAmountCryptoPrecision, sellAssetUsdRate) => {
    if (!sellAssetUsdRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUsdRate).toFixed()
  },
)

export const selectSellAssetBalanceFilter = createSelector(
  selectFirstHopSellAccountId,
  selectInputSellAsset,
  (firstHopSellAccountId, sellAsset) => {
    return {
      accountId: firstHopSellAccountId,
      assetId: sellAsset.assetId,
    }
  },
)

export const selectSellAssetBalanceCryptoBaseUnit = createSelector(
  (state: ReduxState) =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      accountId: selectFirstHopSellAccountId(state),
      assetId: selectInputSellAsset(state).assetId,
    }),
  sellAssetBalanceCryptoBaseUnit => sellAssetBalanceCryptoBaseUnit,
)
