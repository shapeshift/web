import type { AssetId } from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import generatedTradableAssetMap from '../../generated/generatedTradableAssetMap.json'

const mayaPoolIdAssetIdSymbolMap = generatedTradableAssetMap as Record<string, AssetId>

export const assetIdToMayaPoolAssetIdMap = invert(mayaPoolIdAssetIdSymbolMap)

export const mayaPoolAssetIdToAssetId = (id: string): AssetId | undefined =>
  mayaPoolIdAssetIdSymbolMap[id.toUpperCase()]

export const assetIdToMayaPoolAssetId = ({ assetId }: { assetId: AssetId }): string | undefined =>
  assetIdToMayaPoolAssetIdMap[assetId.toLowerCase()]
