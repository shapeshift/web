import { createSelector } from 'reselect'

import { swapSlice } from './swapSlice'

import { selectQuoteIdParamFromRequiredFilter } from '@/state/selectors'

export const selectSwaps = createSelector(swapSlice.selectors.selectSwapsById, swapsById => {
  return Object.values(swapsById)
})

export const selectSwapByQuoteId = createSelector(
  swapSlice.selectors.selectSwapIds,
  swapSlice.selectors.selectSwapsById,
  selectQuoteIdParamFromRequiredFilter,
  (swapIds, swapsById, quoteId) => {
    const swapId = swapIds.find(id => swapsById[id].quoteId === quoteId)

    if (!swapId) return undefined

    return swapsById[swapId]
  },
)
