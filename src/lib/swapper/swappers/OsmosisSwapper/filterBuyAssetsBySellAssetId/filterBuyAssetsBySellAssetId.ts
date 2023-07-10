import type { BuyAssetBySellIdInput } from 'lib/swapper/api'

import { SUPPORTED_ASSET_IDS } from '../utils/constants'

export const filterBuyAssetsBySellAssetId = (args: BuyAssetBySellIdInput): string[] => {
  const { assetIds = [], sellAssetId } = args
  if (!SUPPORTED_ASSET_IDS.includes(sellAssetId)) return []

  return assetIds.filter(
    assetId => SUPPORTED_ASSET_IDS.includes(assetId) && assetId !== sellAssetId,
  )
}
