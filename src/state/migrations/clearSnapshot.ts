import { initialState } from 'state/apis/snapshot/snapshot'
import type { ReduxState } from 'state/reducer'

export const clearSnapshot = (state: ReduxState): ReduxState => {
  // Migration to clear snapshot API
  return {
    ...state,
    snapshot: initialState,
  }
}
