import type { AssetId } from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import generatedTradableAssetMap from '../../generated/generatedTradableAssetMap.json'

const thorPoolIdAssetIdSymbolMap = generatedTradableAssetMap as Record<string, AssetId>

// Lowercase keys so lookups are case-insensitive (required for Solana base58 addresses)
const rawMap = invert(thorPoolIdAssetIdSymbolMap)
export const assetIdToThorPoolAssetIdMap: Record<string, string> = Object.fromEntries(
  Object.entries(rawMap).map(([k, v]) => [k.toLowerCase(), v]),
)

export const thorPoolAssetIdToAssetId = (id: string): AssetId | undefined =>
  thorPoolIdAssetIdSymbolMap[id.toUpperCase()]

export const assetIdToThorPoolAssetId = ({ assetId }: { assetId: AssetId }): string | undefined =>
  assetIdToThorPoolAssetIdMap[assetId.toLowerCase()]
