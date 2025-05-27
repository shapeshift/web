import type { AssetId } from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import generatedTradableAssetMap from '../../generated/generatedTradableAssetMap.json'

const poolIdAssetIdSymbolMap = generatedTradableAssetMap as Record<string, AssetId>

export const assetIdToPoolAssetIdMap = invert(poolIdAssetIdSymbolMap)

export const poolAssetIdToAssetId = (id: string): AssetId | undefined =>
  poolIdAssetIdSymbolMap[id.toUpperCase()]

export const assetIdToPoolAssetId = ({ assetId }: { assetId: AssetId }): string | undefined =>
  assetIdToPoolAssetIdMap[assetId.toLowerCase()]
