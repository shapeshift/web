import { arbitrumNovaChainId, btcChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'

export function filterRelayAssetIds(assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const { chainId } = asset

    if (chainId === btcChainId) {
      return true
    }

    // evm only with no arbitrum nova support for any swappers
    return isEvmChainId(chainId) && chainId !== arbitrumNovaChainId
  })
}
