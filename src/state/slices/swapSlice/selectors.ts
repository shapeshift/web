import { createSelector } from 'reselect'

import { swapSlice } from './swapSlice'

export const selectSwaps = createSelector(swapSlice.selectors.selectSwapsById, swapsById => {
  return Object.values(swapsById)
})
