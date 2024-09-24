import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { ReduxState } from 'state/reducer'
import type { TxHistory } from 'state/slices/txHistorySlice/txHistorySlice'
import { initialState } from 'state/slices/txHistorySlice/txHistorySlice'

export const clearTxHistory = (state: ReduxState): ReduxState => {
  // Migration to clear tx history state
  return {
    ...state,
    txHistory: initialState as TxHistory & PersistPartial,
  }
}
