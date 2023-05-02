import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'
import { filterSameChainEvmBuyAssetsBySellAssetId } from 'lib/swapper/swappers/utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export function filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
  // erc20 only
  const { assetNamespace } = fromAssetId(input.sellAssetId)
  if (assetNamespace !== 'erc20') return []

  return filterSameChainEvmBuyAssetsBySellAssetId(input)
}
