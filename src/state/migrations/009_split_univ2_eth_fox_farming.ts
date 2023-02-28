import type { ReduxState } from 'state/reducer'

import { initialState } from '../slices/opportunitiesSlice/opportunitiesSlice'

export const splitUniV2EthFoxFarming = (state: ReduxState): ReduxState => {
  // Migration to clear opportunitiesApi and opportunitiesApi state
  return {
    ...state,
    opportunities: initialState,
  }
}
