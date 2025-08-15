import type { Asset } from '@shapeshiftoss/types'

import { searchAssets } from '@/lib/assetSearch'

export const filterAssetsBySearchTerm = (search: string, assets: Asset[]) => {
  if (!assets) return []
  return searchAssets(search, assets)
}
