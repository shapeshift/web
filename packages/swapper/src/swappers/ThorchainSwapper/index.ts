import type { AssetId } from '@shapeshiftoss/caip'
import { rujiAssetId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'

export * from './constants'
export * from './utils/poolAssetHelpers/poolAssetHelpers'
export * from './utils/longTailHelpers'

export const isRune = (assetId: AssetId) => assetId === thorchainAssetId
export const isTcy = (assetId: AssetId) => assetId === tcyAssetId
export const isRuji = (assetId: AssetId) => assetId === rujiAssetId
