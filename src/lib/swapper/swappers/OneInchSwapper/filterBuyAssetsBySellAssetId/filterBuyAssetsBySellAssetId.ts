import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export function filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
  const { assetIds = [], sellAssetId } = input

  const assets = selectAssets(store.getState())
  const sellAsset = assets[sellAssetId]

  if (sellAsset === undefined || sellAssetId === ethAssetId || !isEvmChainId(sellAsset.chainId))
    return []

  const result = assetIds.filter(assetId => {
    const buyAsset = assets[assetId]

    if (buyAsset === undefined) return false

    // same-chain swaps and evm only
    return buyAsset.chainId === sellAsset.chainId && isEvmChainId(buyAsset.chainId)
  })

  return result
}
