import filter from 'lodash/filter'
import type { Asset } from 'lib/asset-service'

import blacklist from './blacklist.json'

// blacklist wormhole assets as well - users can't hold a balance and we don't support wormholes
export const filterOutBlacklistedAssets = (unfilteredAssetData: Asset[]) =>
  filter(unfilteredAssetData, asset => {
    return !(blacklist.includes(asset.assetId) || asset.name.toLowerCase().includes('wormhole'))
  })
