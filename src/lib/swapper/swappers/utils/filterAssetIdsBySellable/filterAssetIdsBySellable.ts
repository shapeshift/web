import type { AssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

// we dont perform a lookup to lifi's supported assets because they support far more assets than we do
// so the overhead in performing the fetch to lifi isnt worth the time
export function filterEvmAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
  const assets = selectAssets(store.getState())
  const result = assetIds.filter(assetId => {
    const asset = assets[assetId]

    if (asset === undefined) return false

    const { chainId } = asset

    return evmChainIds.includes(chainId as EvmChainId)
  })

  return result
}
