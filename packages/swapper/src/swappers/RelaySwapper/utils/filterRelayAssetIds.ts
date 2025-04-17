import { arbitrumNovaChainId, btcChainId, solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'

export function filterRelayAssetIds(assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const { chainId } = asset

    if (chainId === btcChainId) {
      return true
    }

    if (chainId === solanaChainId) {
      return true
    }

    // evm only with no arbitrum nova support for any swappers
    return isEvmChainId(chainId) && chainId !== arbitrumNovaChainId
  })
}
