import { createSelector } from '@reduxjs/toolkit'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import type { ReduxState } from 'state/reducer'

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

export const selectSelectedQuote = createSelector(selectTradeQuoteSlice, swappers => swappers.quote)

export const selectSelectedSwapperName = createSelector(
  selectTradeQuoteSlice,
  swappers => swappers.swapperName,
)

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = createSelector(
  selectSelectedSwapperName,
  selectedSwapperName => {
    if (selectedSwapperName === undefined) return undefined

    switch (selectedSwapperName) {
      case SwapperName.Thorchain:
      case SwapperName.Osmosis:
        return true
      // NOTE: Before enabling cross-account for LIFI and OneInch - we must pass the sending address
      // to the swappers up so allowance checks work. They're currently using the receive address
      // assuming it's the same address as the sending address.
      case SwapperName.LIFI:
      case SwapperName.OneInch:
      case SwapperName.Zrx:
      case SwapperName.CowSwap:
      case SwapperName.Test:
        return false
      default:
        assertUnreachable(selectedSwapperName)
    }
  },
)
