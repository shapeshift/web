import type { AssetId } from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import generatedTradableAssetMap from '../../generated/generatedTradableAssetMap.json'

export const thorPoolIdAssetIdSymbolMap = generatedTradableAssetMap as Record<string, AssetId>

const assetIdToPoolAssetIdMap = invert(thorPoolIdAssetIdSymbolMap)

export const poolAssetIdToAssetId = (id: string): AssetId | undefined =>
  thorPoolIdAssetIdSymbolMap[id.toUpperCase()]

export const assetIdToPoolAssetId = ({ assetId }: { assetId: AssetId }): string | undefined =>
  assetIdToPoolAssetIdMap[assetId.toLowerCase()]
