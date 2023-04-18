import type { AssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput } from '@shapeshiftoss/swapper'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

// we dont perform a lookup to lifi's supported assets because they support far more assets than we do
// so the overhead in performing the fetch to lifi isnt worth the time
export function filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
  const { assetIds = [], sellAssetId } = input

  const assets = selectAssets(store.getState())
  const sellAsset = assets[sellAssetId]

  if (sellAsset === undefined) return []

  const result = assetIds.filter(assetId => {
    const buyAsset = assets[assetId]

    if (buyAsset === undefined) return false

    return (
      buyAsset.chainId !== sellAsset.chainId && // no same-chain swaps
      evmChainIds.includes(buyAsset.chainId as EvmChainId) &&
      evmChainIds.includes(sellAsset.chainId as EvmChainId)
    )
  })

  return result
}
