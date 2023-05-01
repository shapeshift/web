import type { ReduxState } from 'state/reducer'
import { initialState } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export const clearPortfolio = (state: ReduxState): ReduxState => {
  // Migration to clear portfolio state
  return {
    ...state,
    portfolio: initialState,
  }
}
