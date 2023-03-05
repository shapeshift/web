import { SwapperName } from '@shapeshiftoss/swapper'
import createCachedSelector from 're-reselect'
import type { SwapperState } from 'components/Trade/SwapperProvider/types'

const selectSwapperSupportsCrossAccountTrade = createCachedSelector(
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
)
