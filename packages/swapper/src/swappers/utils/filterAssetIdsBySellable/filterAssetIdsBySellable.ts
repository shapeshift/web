import { arbitrumNovaChainId } from '@shapeshiftmonorepo/caip'
import { isEvmChainId } from '@shapeshiftmonorepo/chain-adapters'
import type { Asset } from '@shapeshiftmonorepo/types'

export function filterEvmAssetIdsBySellable(assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const { chainId } = asset

    // evm only with no arbitrum nova support for any swappers
    return isEvmChainId(chainId) && chainId !== arbitrumNovaChainId
  })
}
