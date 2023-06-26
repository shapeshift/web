import { createSelector } from '@reduxjs/toolkit'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectCryptoMarketData } from '../marketDataSlice/selectors'
import {
  selectFirstAccountIdByChainId,
  selectHighestFiatBalanceAccountByAssetId,
} from '../portfolioSlice/selectors'

const selectSwappers = (state: ReduxState) => state.swappers

export const selectBuyAsset = createDeepEqualOutputSelector(
  selectSwappers,
  swappers => swappers.buyAsset,
)

export const selectSellAsset = createDeepEqualOutputSelector(
  selectSwappers,
  swappers => swappers.sellAsset,
)

export const selectSellAssetAccountId = createSelector(
  (state: ReduxState) => state,
  selectSwappers,
  selectSellAsset,
  (state, swappers, sellAsset) => {
    const highestFiatBalanceSellAccountId = selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: sellAsset?.assetId,
    })
    const firstSellAssetAccountId = selectFirstAccountIdByChainId(state, sellAsset?.chainId ?? '')
    return swappers.sellAssetAccountId ?? highestFiatBalanceSellAccountId ?? firstSellAssetAccountId
  },
)

export const selectBuyAssetAccountId = createSelector(
  (state: ReduxState) => state,
  selectSwappers,
  selectBuyAsset,
  (state, swappers, buyAsset) => {
    const highestFiatBalanceBuyAccountId = selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: buyAsset?.assetId,
    })
    const firstBuyAssetAccountId = selectFirstAccountIdByChainId(state, buyAsset?.chainId ?? '')
    return swappers.buyAssetAccountId ?? highestFiatBalanceBuyAccountId ?? firstBuyAssetAccountId
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
