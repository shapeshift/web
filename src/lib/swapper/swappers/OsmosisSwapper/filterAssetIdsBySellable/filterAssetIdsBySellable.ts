import type { AssetId } from '@shapeshiftoss/caip'

import { SUPPORTED_ASSET_IDS } from '../utils/constants'

export const filterAssetIdsBySellable = (): AssetId[] => {
  return [...SUPPORTED_ASSET_IDS]
}
