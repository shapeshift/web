import { AssetId, thorchainAssetId } from '@shapeshiftoss/caip'

export const isRune = (assetId: AssetId) => assetId === thorchainAssetId
