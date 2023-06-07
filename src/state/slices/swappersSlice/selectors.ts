import { createSelector } from '@reduxjs/toolkit'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { selectCryptoMarketData } from '../marketDataSlice/selectors'

const selectSwappers = (state: ReduxState) => state.swappers

export const selectSelectedQuote = createSelector(
  selectSwappers,
  swappers => swappers.selectedQuote,
)

export const selectBuyAsset = createDeepEqualOutputSelector(
  selectSwappers,
  swappers => swappers.buyAsset,
)

export const selectSellAsset = createDeepEqualOutputSelector(
  selectSwappers,
  swappers => swappers.sellAsset,
)

export const selectSellAssetAccountId = createSelector(
  selectSwappers,
  swappers => swappers.sellAssetAccountId,
)

export const selectReceiveAddress = createSelector(
  selectSwappers,
  swappers => swappers.receiveAddress,
)

export const selectSellAmountCryptoPrecision = createSelector(
  selectSwappers,
  swappers => swappers.sellAmountCryptoPrecision,
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

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = createSelector(
  selectSelectedQuote,
  selectedQuote => {
    if (selectedQuote === undefined) return undefined

    switch (selectedQuote) {
      case SwapperName.Thorchain:
      case SwapperName.Osmosis:
      case SwapperName.LIFI:
        return true
      case SwapperName.Zrx:
      case SwapperName.CowSwap:
      case SwapperName.Test:
      case SwapperName.OneInch:
        return false
      default:
        assertUnreachable(selectedQuote)
    }
  },
)
