import { createSelector } from '@reduxjs/toolkit'
import { bn } from '@shapeshiftoss/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectMarketDataUsd, selectUserCurrencyToUsdRate } from '../../marketDataSlice/selectors'
import type { TradeInputBaseState } from './createTradeInputBaseSlice'

/**
 * Creates a set of reusable Redux selectors for trade input functionality. This is a higher-order
 * selector factory that generates selectors for any slice that handles trade inputs. It provides
 * selectors for common trade-related data like buy/sell assets, exchange rates, and slippage
 * preferences. This allows multiple features (like trading and limit orders) to reuse the same
 * selector logic while maintaining their own independent state.
 *
 * @param sliceName - The name of the Redux slice to create selectors for
 * @returns An object containing all the generated selectors
 */
export const createTradeInputBaseSelectors = (sliceName: keyof ReduxState) => {
  // Base selector to get the slice
  const selectBaseSlice = (state: ReduxState) => state[sliceName] as TradeInputBaseState

  // Create reusable selectors
  const selectInputBuyAsset = createDeepEqualOutputSelector(
    selectBaseSlice,
    tradeInput => tradeInput.buyAsset,
  )

  const selectInputSellAsset = createDeepEqualOutputSelector(
    selectBaseSlice,
    tradeInput => tradeInput.sellAsset,
  )

  const selectInputSellAssetUsdRate = createSelector(
    selectInputSellAsset,
    selectMarketDataUsd,
    (sellAsset, marketDataUsd) => {
      if (sellAsset === undefined) return
      return marketDataUsd[sellAsset.assetId]?.price
    },
  )

  const selectInputBuyAssetUsdRate = createSelector(
    selectInputBuyAsset,
    selectMarketDataUsd,
    (buyAsset, marketDataUsd) => {
      if (buyAsset === undefined) return
      return marketDataUsd[buyAsset.assetId]?.price
    },
  )

  const selectInputSellAssetUserCurrencyRate = createSelector(
    selectInputSellAssetUsdRate,
    selectUserCurrencyToUsdRate,
    (sellAssetUsdRate, userCurrencyToUsdRate) => {
      if (sellAssetUsdRate === undefined) return
      return bn(sellAssetUsdRate).times(userCurrencyToUsdRate).toString()
    },
  )

  const selectInputBuyAssetUserCurrencyRate = createSelector(
    selectInputBuyAssetUsdRate,
    selectUserCurrencyToUsdRate,
    (buyAssetUsdRate, userCurrencyToUsdRate) => {
      if (buyAssetUsdRate === undefined) return
      return bn(buyAssetUsdRate).times(userCurrencyToUsdRate).toString()
    },
  )

  const selectUserSlippagePercentage = createSelector(
    selectBaseSlice,
    tradeInput => tradeInput.slippagePreferencePercentage,
  )

  // User input comes in as an actual percentage e.g 1 for 1%, so we need to convert it to a decimal e.g 0.01 for 1%
  const selectUserSlippagePercentageDecimal = createSelector(
    selectUserSlippagePercentage,
    slippagePercentage => {
      if (!slippagePercentage) return
      return bn(slippagePercentage).div(100).toString()
    },
  )

  return {
    selectBaseSlice,
    selectInputBuyAsset,
    selectInputSellAsset,
    selectInputSellAssetUsdRate,
    selectInputBuyAssetUsdRate,
    selectInputSellAssetUserCurrencyRate,
    selectInputBuyAssetUserCurrencyRate,
    selectUserSlippagePercentage,
    selectUserSlippagePercentageDecimal,
  }
}
