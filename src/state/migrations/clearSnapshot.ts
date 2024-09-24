import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { SnapshotState } from 'state/apis/snapshot/snapshot'
import { initialState } from 'state/apis/snapshot/snapshot'

export const clearSnapshot = (_state: SnapshotState): SnapshotState & PersistPartial => {
  // Migration to clear snapshot API
  return initialState as SnapshotState & PersistPartial
}
