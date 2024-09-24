import type { PersistPartial } from 'redux-persist/es/persistReducer'
import type { ReduxState } from 'state/reducer'
import type { OpportunitiesState } from 'state/slices/opportunitiesSlice/types'

import { initialState } from '../slices/opportunitiesSlice/opportunitiesSlice'

export const clearOpportunities = (state: ReduxState): ReduxState => {
  // Migration to clear opportunitiesApi and opportunitiesApi state
  return {
    ...state,
    opportunities: initialState as OpportunitiesState & PersistPartial,
  }
}
