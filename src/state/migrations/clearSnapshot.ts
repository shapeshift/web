import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { SnapshotState } from 'state/apis/snapshot/snapshot'
import { initialState } from 'state/apis/snapshot/snapshot'
import type { ReduxState } from 'state/reducer'

export const clearSnapshot = (state: ReduxState): ReduxState => {
  // Migration to clear snapshot API
  return {
    ...state,
    snapshot: initialState as SnapshotState & PersistPartial,
  }
}
