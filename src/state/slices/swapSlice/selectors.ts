import { createSelector } from 'reselect'

import { swapSlice } from './swapSlice'

export const selectCurrentSwap = createSelector(
  swapSlice.selectors.selectSwapsById,
  swapSlice.selectors.selectActiveSwapId,
  (swapsById, activeSwapId) => {
    if (!activeSwapId) return undefined

    return swapsById[activeSwapId]
  },
)
