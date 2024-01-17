import { createSelector } from '@reduxjs/toolkit'
import type { Selector } from 'react-redux'
import { bn } from 'lib/bignumber/bignumber'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectWalletAccountIds } from '../common-selectors'
import { selectCryptoMarketData } from '../marketDataSlice/selectors'
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

export const selectInputSellAssetUsdRate = createSelector(
  selectInputSellAsset,
  selectCryptoMarketData,
  (sellAsset, cryptoMarketData) => {
    const sellAssetMarketData = cryptoMarketData[sellAsset.assetId]
    return sellAssetMarketData?.price
  },
)

export const selectManualReceiveAddress = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddress,
)

export const selectManualReceiveAddressIsValidating = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddressIsValidating,
)

export const selectInputSellAmountUsd = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAssetUsdRate,
  (sellAmountCryptoPrecision, sellAssetUsdRate) => {
    if (!sellAssetUsdRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUsdRate).toFixed()
  },
)
