import type { AssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput, Swapper } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { executeEvmTransaction } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const arbitrumBridgeSwapper: Swapper = {
  executeEvmTransaction,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(
      // TODO(gomes): should be Arb supported networks only
      assets.filter(asset => isEvmChainId(asset.chainId)).map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    // TODO(gomes): actually implement me
    return Promise.resolve(input.assets.map(asset => asset.assetId))
  },
}
