import type { AssetId } from '@shapeshiftoss/caip'
import { mayachainAssetId } from '@shapeshiftoss/caip'

export const isCacao = (assetId: AssetId) => assetId === mayachainAssetId
