import type { AssetId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import type { Flag } from './preferencesSlice'
import { preferences } from './preferencesSlice'

import { isMobile as isMobileApp } from '@/lib/globals'
import type { ReduxState } from '@/state/reducer'

export const selectFeatureFlags = preferences.selectors.selectFeatureFlags
export const selectWatchedAssetIds = preferences.selectors.selectWatchedAssetIds
export const selectSelectedLocale = preferences.selectors.selectSelectedLocale
export const selectSelectedCurrency = preferences.selectors.selectSelectedCurrency
export const selectBalanceThreshold = preferences.selectors.selectBalanceThreshold
export const selectCurrencyFormat = preferences.selectors.selectCurrencyFormat
export const selectChartTimeframe = preferences.selectors.selectChartTimeframe
export const selectShowWelcomeModal = preferences.selectors.selectShowWelcomeModal
export const selectShowSnapsModal = preferences.selectors.selectShowSnapsModal
export const selectSelectedHomeView = preferences.selectors.selectSelectedHomeView

export const selectFeatureFlag = createCachedSelector(
  selectFeatureFlags,
  (_state: ReduxState, flag: Flag) => flag,
  (featureFlags, flag) => featureFlags[flag],
)((_state: ReduxState, flag: Flag): Flag => flag ?? 'undefined')

export const selectIsAssetIdWatched = createCachedSelector(
  selectWatchedAssetIds,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (watchedAssetIds, assetId) => watchedAssetIds.includes(assetId),
)((_state: ReduxState, assetId: AssetId): AssetId => assetId ?? 'undefined')

export const selectShowConsentBanner = (state: ReduxState) => {
  const consentEnabled = selectFeatureFlag(state, 'Mixpanel')
  return consentEnabled && state.preferences.showConsentBanner && !isMobileApp
}
