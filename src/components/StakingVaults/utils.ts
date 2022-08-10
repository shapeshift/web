import { AssetId } from '@shapeshiftoss/caip'
import {
  foxEthLpAssetId,
  foxEthLpOpportunityName,
} from 'features/defi/providers/fox-eth-lp/constants'

export const getOverrideNameFromAssetId = (assetId: AssetId): string | null => {
  const overrideAssetIdNames: Record<AssetId, string> = {
    [foxEthLpAssetId]: foxEthLpOpportunityName,
  }
  return overrideAssetIdNames[assetId] ?? null
}
