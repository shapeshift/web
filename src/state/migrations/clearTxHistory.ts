import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { TxHistory } from 'state/slices/txHistorySlice/txHistorySlice'
import { initialState } from 'state/slices/txHistorySlice/txHistorySlice'

export const clearTxHistory = (_state: TxHistory): TxHistory & PersistPartial => {
  // Migration to clear tx history state
  return initialState as TxHistory & PersistPartial
}
