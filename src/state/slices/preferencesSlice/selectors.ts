import createCachedSelector from 're-reselect'
import { ReduxState } from 'state/reducer'

import { Flag } from './preferencesSlice'

export const selectFeatureFlags = (state: ReduxState) => state.preferences.featureFlags

export const selectFeatureFlag = createCachedSelector(
  selectFeatureFlags,
  (_state: ReduxState, flag: Flag) => flag,
  (featureFlags, flag) => featureFlags[flag],
)((flags, flag: Flag): Flag => flag)

export const selectSelectedLocale = (state: ReduxState) => state.preferences.selectedLocale
export const selectBalanceThreshold = (state: ReduxState) => state.preferences.balanceThreshold
