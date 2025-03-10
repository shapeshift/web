import type { PersistPartial } from 'redux-persist/es/persistReducer'

import { initialState } from '../slices/opportunitiesSlice/opportunitiesSlice'

import type { OpportunitiesState } from '@/state/slices/opportunitiesSlice/types'

export const clearOpportunities = (
  _state: OpportunitiesState,
): OpportunitiesState & PersistPartial => {
  // Migration to clear opportunitiesApi and opportunitiesApi state
  return initialState as OpportunitiesState & PersistPartial
}
