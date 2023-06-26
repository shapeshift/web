import { createSelector } from '@reduxjs/toolkit'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectWalletAccountIds } from '../common-selectors'
import { selectCryptoMarketData } from '../marketDataSlice/selectors'
import { selectPortfolioAssetAccountBalancesSortedFiat } from '../portfolioSlice/selectors'
import {
  getFirstAccountIdByChainId,
  getHighestFiatBalanceAccountByAssetId,
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

// selects the account ID we're selling from
// note lack of "asset" and "hop" vernacular - this is deliberate
export const selectSellAccountId = createSelector(
  selectSwappers,
  selectSellAsset,
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectWalletAccountIds,
  (swappers, sellAsset, accountIdAssetValues, accountIds) => {
    if (swappers.sellAssetAccountId) return swappers.sellAssetAccountId

    const highestFiatBalanceSellAccountId = getHighestFiatBalanceAccountByAssetId(
      accountIdAssetValues,
      sellAsset.assetId,
    )
    const firstSellAssetAccountId = getFirstAccountIdByChainId(accountIds, sellAsset.chainId)

    return highestFiatBalanceSellAccountId ?? firstSellAssetAccountId
  },
)

// selects the account ID we're buying into
// note lack of "asset" and "hop" vernacular - this is deliberate
export const selectBuyAccountId = createSelector(
  selectSwappers,
  selectBuyAsset,
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectWalletAccountIds,
  (swappers, buyAsset, accountIdAssetValues, accountIds) => {
    if (swappers.buyAssetAccountId) return swappers.buyAssetAccountId

    const highestFiatBalanceBuyAccountId = getHighestFiatBalanceAccountByAssetId(
      accountIdAssetValues,
      buyAsset.assetId,
    )
    const firstBuyAssetAccountId = getFirstAccountIdByChainId(accountIds, buyAsset.chainId)

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
