import type { BuyAssetBySellIdInput } from 'lib/swapper/api'

import { SUPPORTED_ASSET_IDS } from '../utils/constants'

export const filterBuyAssetsBySellAssetId = (args: BuyAssetBySellIdInput): string[] => {
  const { nonNftAssetIds = [], sellAssetId } = args
  if (!SUPPORTED_ASSET_IDS.includes(sellAssetId)) return []

  return nonNftAssetIds.filter(
    assetId => SUPPORTED_ASSET_IDS.includes(assetId) && assetId !== sellAssetId,
  )
}
