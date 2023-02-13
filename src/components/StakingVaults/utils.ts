import type { AssetId } from '@shapeshiftoss/caip'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'

export const getOverrideNameFromAssetId = (assetId: AssetId): string | null => {
  const overrideAssetIdNames: Record<AssetId, string> = {
    [foxEthLpAssetId]: 'ETH/FOX Pool',
  }
  return overrideAssetIdNames[assetId] ?? null
}
