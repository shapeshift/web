import type { AssetId } from '@shapeshiftmonorepo/caip'
import { thorchainAssetId } from '@shapeshiftmonorepo/caip'

export const isRune = (assetId: AssetId) => assetId === thorchainAssetId
