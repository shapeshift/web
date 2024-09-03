import { arbitrumNovaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'

export function filterEvmAssetIdsBySellable(assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const { chainId } = asset

    // evm only with no arbitrum nova support for any swappers
    return isEvmChainId(chainId) && chainId !== arbitrumNovaChainId
  })
}
