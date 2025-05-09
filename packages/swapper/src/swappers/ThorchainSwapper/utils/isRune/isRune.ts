import type { AssetId } from '@shapeshiftoss/caip'
import { tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'

export const isRune = (assetId: AssetId) => assetId === thorchainAssetId
export const isTcy = (assetId: AssetId) => assetId === tcyAssetId
