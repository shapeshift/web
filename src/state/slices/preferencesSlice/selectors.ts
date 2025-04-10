import type { AssetId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import type { Flag } from './preferencesSlice'
import { preferences } from './preferencesSlice'

import { isMobile as isMobileApp } from '@/lib/globals'
import type { ReduxState } from '@/state/reducer'

export const selectSelectedLocale = preferences.selectors.selectSelectedLocale
export const selectSelectedCurrency = preferences.selectors.selectSelectedCurrency

export const selectFeatureFlag = createCachedSelector(
  preferences.selectors.selectFeatureFlags,
  (_state: ReduxState, flag: Flag) => flag,
  (featureFlags, flag) => featureFlags[flag],
)((_state: ReduxState, flag: Flag): Flag => flag ?? 'undefined')

export const selectIsAssetIdWatched = createCachedSelector(
  preferences.selectors.selectWatchedAssetIds,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (watchedAssetIds, assetId) => watchedAssetIds.includes(assetId),
)((_state: ReduxState, assetId: AssetId): AssetId => assetId ?? 'undefined')

export const selectShowConsentBanner = (state: ReduxState) => {
  const consentEnabled = selectFeatureFlag(state, 'Mixpanel')
  return consentEnabled && state.preferences.showConsentBanner && !isMobileApp
}
