import type { AssetId } from '@shapeshiftoss/caip'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'
import { filterSameChainEvmBuyAssetsBySellAssetId } from 'lib/swapper/swappers/utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'

export function filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
  // 1inch swapper currently supports erc20s only
  if (isNativeEvmAsset(input.sellAssetId)) return []

  return filterSameChainEvmBuyAssetsBySellAssetId(input)
}
