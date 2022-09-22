import createCachedSelector from 're-reselect'
import type { ReduxState } from 'state/reducer'

import type { Flag } from './preferencesSlice'

export const selectFeatureFlags = (state: ReduxState) => state.preferences.featureFlags

export const selectFeatureFlag = createCachedSelector(
  selectFeatureFlags,
  (_state: ReduxState, flag: Flag) => flag,
  (featureFlags, flag) => featureFlags[flag],
)((_, flag: Flag): Flag => flag ?? 'undefined')

export const selectSelectedLocale = (state: ReduxState) => state.preferences.selectedLocale
export const selectSelectedCurrency = (state: ReduxState) => state.preferences.selectedCurrency
export const selectBalanceThreshold = (state: ReduxState) => state.preferences.balanceThreshold
export const selectCurrencyFormat = (state: ReduxState) => state.preferences.currencyFormat
export const selectShowWelcomeModal = (state: ReduxState) => state.preferences.showWelcomeModal
