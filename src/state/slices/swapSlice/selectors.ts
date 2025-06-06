import { createSelector } from 'reselect'

import { swapSlice } from './swapSlice'

import { selectSwapIdParamFromRequiredFilter } from '@/state/selectors'

export const selectSwaps = createSelector(swapSlice.selectors.selectSwapsById, swapsById => {
  return Object.values(swapsById)
})

export const selectSwapById = createSelector(
  swapSlice.selectors.selectSwapsById,
  selectSwapIdParamFromRequiredFilter,
  (swapsById, swapId) => {
    const swap = swapsById[swapId]
    if (!swap) return
    return swap
  },
)
