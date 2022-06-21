import { Asset } from '@shapeshiftoss/types'
import filter from 'lodash/filter'

import blacklist from './blacklist.json'

export const filterOutBlacklistedAssets = (unfilteredAssetData: Asset[]) =>
  filter(unfilteredAssetData, ({ assetId }) => !blacklist.includes(assetId))
