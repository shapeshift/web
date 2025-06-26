import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { selectAssetsBySearchQuery } from './common-selectors'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'

export enum GlobalSearchResultType {
  Asset = 'Asset',
}

export type AssetSearchResult = {
  type: GlobalSearchResultType.Asset
  id: AssetId
}

export type AssetSearchResults = AssetSearchResult[]

export const selectGlobalItemsFromFilter = createDeepEqualOutputSelector(
  selectAssetsBySearchQuery,
  (filteredAssets: Asset[]): AssetSearchResults => {
    const limit = 10
    const assetSearchResults: AssetSearchResults = filteredAssets
      .map(asset => {
        return {
          type: GlobalSearchResultType.Asset as const,
          id: asset.assetId,
        }
      })
      .slice(0, limit)
    return assetSearchResults
  },
)
