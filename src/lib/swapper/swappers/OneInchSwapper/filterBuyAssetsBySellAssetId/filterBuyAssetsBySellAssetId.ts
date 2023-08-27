import type { AssetId } from '@shapeshiftoss/caip'
import { filterSameChainEvmBuyAssetsBySellAssetId } from 'lib/swapper/swappers/utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { BuyAssetBySellIdInput } from 'lib/swapper/types'

export function filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
  // 1inch swapper currently supports erc20s only
  if (isNativeEvmAsset(input.sellAsset.assetId)) return []

  return filterSameChainEvmBuyAssetsBySellAssetId(input).map(asset => asset.assetId)
}
