import type { AssetId } from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import generatedTradableAssetMap from '../../generated/generatedTradableAssetMap.json'

const thorPoolIdAssetIdSymbolMap = generatedTradableAssetMap as Record<string, AssetId>

export const assetIdToThorPoolAssetIdMap: Record<string, string> = invert(
  thorPoolIdAssetIdSymbolMap,
)

const assetIdToThorPoolAssetIdMapLower: Record<string, string> = Object.fromEntries(
  Object.entries(assetIdToThorPoolAssetIdMap).map(([k, v]) => [k.toLowerCase(), v]),
)

export const thorPoolAssetIdToAssetId = (id: string): AssetId | undefined =>
  thorPoolIdAssetIdSymbolMap[id.toUpperCase()]

export const assetIdToThorPoolAssetId = ({ assetId }: { assetId: AssetId }): string | undefined =>
  assetIdToThorPoolAssetIdMapLower[assetId.toLowerCase()]
