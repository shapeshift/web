import type { ReduxState } from 'state/reducer'
import { initialState } from 'state/slices/txHistorySlice/txHistorySlice'

export const clearTxHistory = (state: ReduxState): ReduxState => {
  // Migration to clear tx history state
  return {
    ...state,
    txHistory: initialState,
  }
}
