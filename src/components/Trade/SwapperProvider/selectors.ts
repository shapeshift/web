import { SwapperName } from '@shapeshiftoss/swapper'
import createCachedSelector from 're-reselect'
import type { SwapperState } from 'components/Trade/SwapperProvider/types'

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = createCachedSelector(
  (state: SwapperState) => state.activeSwapperWithMetadata?.swapper,
  (activeSwapper): boolean => {
    switch (activeSwapper?.name) {
      case SwapperName.Thorchain:
      case SwapperName.Osmosis:
        return true
      case SwapperName.Zrx:
      case SwapperName.CowSwap:
        return false
      default:
        return false
    }
  },
)(state => state.activeSwapperWithMetadata?.swapper?.name ?? 'undefined')
