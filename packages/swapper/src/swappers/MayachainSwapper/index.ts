import type { AssetId } from '@shapeshiftoss/caip'
import { mayachainAssetId } from '@shapeshiftoss/caip'

export * from './constants'
export * from './utils/poolAssetHelpers/poolAssetHelpers'

export const isCacao = (assetId: AssetId) => assetId === mayachainAssetId
