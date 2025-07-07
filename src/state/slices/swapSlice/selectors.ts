import { createSelector } from 'reselect'

import { swapSlice } from './swapSlice'

import { selectSwapIdParamFromRequiredFilter } from '@/state/selectors'

export const selectSwapById = createSelector(
  swapSlice.selectors.selectSwapsById,
  selectSwapIdParamFromRequiredFilter,
  (swapsById, swapId) => {
    const swap = swapsById[swapId]
    if (!swap) return
    return swap
  },
)

export const selectCurrentSwap = createSelector(
  swapSlice.selectors.selectSwapsById,
  swapSlice.selectors.selectActiveSwapId,
  (swapsById, activeSwapId) => {
    if (!activeSwapId) return undefined

    return swapsById[activeSwapId]
  },
)
