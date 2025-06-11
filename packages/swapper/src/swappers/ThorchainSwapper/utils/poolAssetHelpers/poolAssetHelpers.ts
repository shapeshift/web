import type { AssetId } from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import generatedTradableAssetMap from '../../generated/generatedTradableAssetMap.json'

const thorPoolIdAssetIdSymbolMap = generatedTradableAssetMap as Record<string, AssetId>

export const assetIdToThorPoolAssetIdMap = invert(thorPoolIdAssetIdSymbolMap)

export const thorPoolAssetIdToAssetId = (id: string): AssetId | undefined =>
  thorPoolIdAssetIdSymbolMap[id.toUpperCase()]

export const assetIdToThorPoolAssetId = ({ assetId }: { assetId: AssetId }): string | undefined =>
  assetIdToThorPoolAssetIdMap[assetId.toLowerCase()]
