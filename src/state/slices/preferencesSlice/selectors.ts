import { createSelector } from '@reduxjs/toolkit'
import { ReduxState } from 'state/reducer'

import { FeatureFlags } from './preferencesSlice'

export const selectFeatureFlags = (state: ReduxState) => state.preferences.featureFlags

export const selectFeatureFlag = createSelector(
  selectFeatureFlags,
  (_state: ReduxState, flag: keyof FeatureFlags) => flag,
  (featureFlags, flag) => featureFlags[flag]
)
