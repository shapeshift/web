import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'

export const isRune = (assetId: AssetId) => assetId === thorchainAssetId
