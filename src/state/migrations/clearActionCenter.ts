import type { PersistPartial } from 'redux-persist/es/persistReducer'

import { initialState } from '@/state/slices/actionSlice/actionSlice'
import type { ActionCenterState } from '@/state/slices/actionSlice/types'

export const clearActionCenter = (
  _state: ActionCenterState,
): ActionCenterState & PersistPartial => {
  // Migration to clear notificationCenter state
  return initialState as ActionCenterState & PersistPartial
}
