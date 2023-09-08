import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { Asset } from 'lib/asset-service'

// we dont perform a lookup to lifi's supported assets because they support far more assets than we do
// so the overhead in performing the fetch to lifi isnt worth the time
export function filterEvmAssetIdsBySellable(assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const { chainId } = asset

    return evmChainIds.includes(chainId as EvmChainId)
  })
}
