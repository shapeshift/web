import filter from 'lodash/filter'

import { Asset } from '../service/AssetService'
import blacklist from './blacklist.json'

export const filterOutBlacklistedAssets = (unfilteredAssetData: Asset[]) =>
  filter(unfilteredAssetData, ({ assetId }) => !blacklist.includes(assetId))
