import type { Swap } from '@shapeshiftoss/swapper'
import { createSelector } from 'reselect'

import { swapSlice } from './swapSlice'

import { selectQuoteIdParamFromFilter } from '@/state/selectors'

export const selectSwaps = swapSlice.selectors.selectSwaps

export const selectSwapById = createSelector(selectSwaps, swaps => {
  return swaps.reduce(
    (acc, swap) => {
      acc[swap.id] = swap
      return acc
    },
    {} as Record<string, Swap>,
  )
})

export const selectSwapByQuoteId = createSelector(
  selectSwaps,
  selectQuoteIdParamFromFilter,
  (swaps, quoteId) => {
    return swaps.find(s => s.quoteId === quoteId)
  },
)
