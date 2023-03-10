import type { Token as LifiToken } from '@lifi/sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export function filterAssetIdsBySellable(
  assetIds: AssetId[],
  lifiTokenMap: Map<AssetId, LifiToken>,
): AssetId[] {
  const assets = selectAssets(store.getState())
  const result = assetIds.filter(assetId => {
    const asset = assets[assetId]

    if (asset === undefined) return false

    const { chainId } = asset

    return evmChainIds.includes(chainId as EvmChainId) && lifiTokenMap.has(assetId)
  })

  return result
}
