import { arbitrumChainId, ethChainId } from '@shapeshiftoss/caip'

import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS } from './utils/constants'

export const arbitrumBridgeSwapper: Swapper = {
  executeEvmTransaction,
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(
      assets
        .filter(asset => ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
  filterBuyAssetsBySellAssetId: input => {
    const supportedChainIds = (() => {
      switch (input.sellAsset.chainId) {
        case ethChainId:
          return [arbitrumChainId]
        case arbitrumChainId:
          return [ethChainId]
        default:
          return []
      }
    })()

    return Promise.resolve(
      input.assets
        .filter(asset => supportedChainIds.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
}
