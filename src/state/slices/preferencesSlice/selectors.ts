import type { AssetId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import type { Flag } from './preferencesSlice'
import { preferences } from './preferencesSlice'

import type { ReduxState } from '@/state/reducer'

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

export const selectIsSpamMarkedByAssetId = createCachedSelector(
  preferences.selectors.selectSpamMarkedAssetIds,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (spamMarkedAssetIds, assetId): boolean => spamMarkedAssetIds.includes(assetId),
)((_state: ReduxState, assetId: AssetId): AssetId => assetId ?? 'assetId')
