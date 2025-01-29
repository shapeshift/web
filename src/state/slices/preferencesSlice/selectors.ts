import type { AssetId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'
import { isMobile as isMobileApp } from 'lib/globals'
import type { ReduxState } from 'state/reducer'

import type { Flag } from './preferencesSlice'

export const selectFeatureFlags = (state: ReduxState) => state.preferences.featureFlags

export const selectFeatureFlag = createCachedSelector(
  selectFeatureFlags,
  (_state: ReduxState, flag: Flag) => flag,
  (featureFlags, flag) => featureFlags[flag],
)((_, flag: Flag): Flag => flag ?? 'undefined')

export const selectWatchedAssetIds = (state: ReduxState) => state.preferences.watchedAssets

export const selectIsAssetIdWatched = createCachedSelector(
  selectWatchedAssetIds,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (watchedAssets, assetId) => watchedAssets.includes(assetId),
)((_state: ReduxState, assetId: AssetId | undefined): AssetId => assetId ?? 'undefined')

export const selectSelectedLocale = (state: ReduxState) => state.preferences.selectedLocale
export const selectSelectedCurrency = (state: ReduxState) => state.preferences.selectedCurrency
export const selectBalanceThreshold = (state: ReduxState) => state.preferences.balanceThreshold
export const selectCurrencyFormat = (state: ReduxState) => state.preferences.currencyFormat
export const selectChartTimeframe = (state: ReduxState) => state.preferences.chartTimeframe
export const selectShowWelcomeModal = (state: ReduxState) => state.preferences.showWelcomeModal
export const selectShowSnapsModal = (state: ReduxState) => state.preferences.showSnapsModal
export const selectSelectedHomeView = (state: ReduxState) => state.preferences.selectedHomeView

export const selectShowConsentBanner = (state: ReduxState) => {
  const consentEnabled = selectFeatureFlag(state, 'Mixpanel')
  return consentEnabled && state.preferences.showConsentBanner && !isMobileApp
}
