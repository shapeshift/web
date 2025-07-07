import type { PersistPartial } from 'redux-persist/es/persistReducer'

import { initialState } from '@/state/slices/actionSlice/actionSlice'
import type { ActionState } from '@/state/slices/actionSlice/types'

export const clearAction = (_state: ActionState): ActionState & PersistPartial => {
  // Migration to clear actonSlice state
  return initialState as ActionState & PersistPartial
}
