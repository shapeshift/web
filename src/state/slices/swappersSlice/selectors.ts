import { createSelector } from '@reduxjs/toolkit'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectWalletAccountIds } from '../common-selectors'
import { selectCryptoMarketData } from '../marketDataSlice/selectors'
import { selectPortfolioAssetAccountBalancesSortedUserCurrency } from '../portfolioSlice/selectors'
import {
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from '../portfolioSlice/utils'

const selectSwappers = (state: ReduxState) => state.swappers

export const selectBuyAsset = createDeepEqualOutputSelector(
  selectSwappers,
  swappers => swappers.buyAsset,
)

export const selectSellAsset = createDeepEqualOutputSelector(
  selectSwappers,
  swappers => swappers.sellAsset,
)

export const selectSlippagePreferencePercentage = createSelector(
  selectSwappers,
  swappers => swappers.slippagePreferencePercentage,
)

// selects the account ID we're selling from
// note lack of "asset" and "hop" vernacular - this is deliberate
export const selectSellAccountId = createSelector(
  selectSwappers,
  selectSellAsset,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectWalletAccountIds,
  (swappers, sellAsset, accountIdAssetValues, accountIds) => {
    // return the users selection if it exists
    if (swappers.sellAssetAccountId) return swappers.sellAssetAccountId

    const highestFiatBalanceSellAccountId = getHighestUserCurrencyBalanceAccountByAssetId(
      accountIdAssetValues,
      sellAsset.assetId,
    )
    const firstSellAssetAccountId = getFirstAccountIdByChainId(accountIds, sellAsset.chainId)

    // otherwise return a sane default
    return highestFiatBalanceSellAccountId ?? firstSellAssetAccountId
  },
)

// selects the account ID we're buying into
// note lack of "asset" and "hop" vernacular - this is deliberate
export const selectBuyAccountId = createSelector(
  selectSwappers,
  selectBuyAsset,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectWalletAccountIds,
  (swappers, buyAsset, accountIdAssetValues, accountIds) => {
    // return the users selection if it exists
    if (swappers.buyAssetAccountId) return swappers.buyAssetAccountId

    const highestFiatBalanceBuyAccountId = getHighestUserCurrencyBalanceAccountByAssetId(
      accountIdAssetValues,
      buyAsset.assetId,
    )
    const firstBuyAssetAccountId = getFirstAccountIdByChainId(accountIds, buyAsset.chainId)

    // otherwise return a sane default
    return highestFiatBalanceBuyAccountId ?? firstBuyAssetAccountId
  },
)

export const selectSellAmountCryptoPrecision = createSelector(
  selectSwappers,
  swappers => swappers.sellAmountCryptoPrecision,
)

export const selectTradeExecutionStatus = createSelector(
  selectSwappers,
  swappers => swappers.tradeExecutionStatus,
)

export const selectBuyAssetUsdRate = createSelector(
  selectBuyAsset,
  selectCryptoMarketData,
  (buyAsset, cryptoMarketData) => {
    const buyAssetMarketData = cryptoMarketData[buyAsset.assetId]
    if (!buyAssetMarketData)
      throw Error(`missing market data for buyAsset.assetId ${buyAsset.assetId}`)
    return buyAssetMarketData.price
  },
)

export const selectWillDonate = createSelector(selectSwappers, swappers => swappers.willDonate)

export const selectManualReceiveAddress = createSelector(
  selectSwappers,
  swappers => swappers.manualReceiveAddress,
)

export const selectManualReceiveAddressIsValidating = createSelector(
  selectSwappers,
  swappers => swappers.manualReceiveAddressIsValidating,
)
