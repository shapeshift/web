import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { OpportunitiesState } from 'state/slices/opportunitiesSlice/types'

import { initialState } from '../slices/opportunitiesSlice/opportunitiesSlice'

export const clearOpportunities = (
  _state: OpportunitiesState,
): OpportunitiesState & PersistPartial => {
  // Migration to clear opportunitiesApi and opportunitiesApi state
  return initialState as OpportunitiesState & PersistPartial
}
