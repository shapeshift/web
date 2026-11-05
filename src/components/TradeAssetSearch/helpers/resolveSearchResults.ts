import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { isSome } from '@/lib/utils'

type ResolveSearchResultsArgs = {
  resultAssetIds: AssetId[]
  usableAssetsById: PartialRecord<AssetId, Asset>
  relatedAssetIdsByKey: PartialRecord<AssetId, AssetId[]>
  assetsById: AssetsByIdPartial
  groupVariants: boolean
}

// Search keeps one result per family, so a result this list can't use is swapped for its versions that it can
export const resolveSearchResults = ({
  resultAssetIds,
  usableAssetsById,
  relatedAssetIdsByKey,
  assetsById,
  groupVariants,
}: ResolveSearchResultsArgs): Asset[] =>
  uniqBy(
    resultAssetIds.flatMap(assetId => {
      const usableAsset = usableAssetsById[assetId]
      if (usableAsset) return [usableAsset]
      const asset = assetsById[assetId]
      const relatedAssetKey = asset?.relatedAssetKey ?? assetId
      const usableVariants = (relatedAssetIdsByKey[relatedAssetKey] ?? [])
        .map(relatedAssetId => usableAssetsById[relatedAssetId])
        .filter(isSome)
      // The asset's own row lists only the usable versions when grouped
      if (groupVariants && asset && usableVariants.length > 1) return [asset]
      return usableVariants
    }),
    asset => asset.assetId,
  )
