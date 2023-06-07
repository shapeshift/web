import type { AssetId } from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import generatedTradableThorAssetMap from '../../generated/generatedTradableThorAssetMap.json'

export const thorPoolIdAssetIdSymbolMap = generatedTradableThorAssetMap as Record<string, AssetId>

const assetIdToPoolAssetIdMap = invert(thorPoolIdAssetIdSymbolMap)

export const poolAssetIdToAssetId = (id: string): AssetId | undefined =>
  thorPoolIdAssetIdSymbolMap[id.toUpperCase()]

export const assetIdToPoolAssetId = ({ assetId }: { assetId: AssetId }): string | undefined =>
  assetIdToPoolAssetIdMap[assetId.toLowerCase()]
