import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const oneInchSwapper: Swapper = {
  executeEvmTransaction,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      filterSameChainEvmBuyAssetsBySellAssetId(input).map(asset => asset.assetId),
    )
  },
}
