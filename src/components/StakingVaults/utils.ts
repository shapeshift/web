import type { AssetId } from '@shapeshiftoss/caip'
import { earnLpOpportunity, foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'

export const getOverrideNameFromAssetId = (assetId: AssetId): string | null => {
  const overrideAssetIdNames: Record<AssetId, string> = {
    [foxEthLpAssetId]: earnLpOpportunity.opportunityName!,
  }
  return overrideAssetIdNames[assetId] ?? null
}
