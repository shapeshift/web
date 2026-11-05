import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { isSome } from '@/lib/utils'

type ResolveSearchResultsArgs = {
  resultAssetIds: AssetId[]
  usableAssetsById: PartialRecord<AssetId, Asset>
  relatedAssetIdsByKey: PartialRecord<AssetId, AssetId[]>
  assetsById: AssetsByIdPartial
  activeChainId: ChainId | 'All'
  isAddressSearch: boolean
}

// Search keeps one result per family, so a result this list can't use is swapped for its versions that it can
export const resolveSearchResults = ({
  resultAssetIds,
  usableAssetsById,
  relatedAssetIdsByKey,
  assetsById,
  activeChainId,
  isAddressSearch,
}: ResolveSearchResultsArgs): Asset[] =>
  uniqBy(
    resultAssetIds.flatMap(assetId => {
      const usableAsset = usableAssetsById[assetId]
      if (usableAsset) return [usableAsset]
      // An address search only ever shows the token at that address
      if (isAddressSearch) return []

      const relatedAssetKey = assetsById[assetId]?.relatedAssetKey ?? assetId
      const usableVariants = (relatedAssetIdsByKey[relatedAssetKey] ?? [])
        .map(relatedAssetId => usableAssetsById[relatedAssetId])
        .filter(isSome)

      if (activeChainId !== 'All') {
        return usableVariants.filter(variant => variant.chainId === activeChainId)
      }

      // The family's main asset row lists only the usable versions when grouped
      const familyAsset = assetsById[relatedAssetKey]
      if (familyAsset && usableVariants.length > 1) return [familyAsset]
      return usableVariants
    }),
    asset => asset.assetId,
  )
