import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import type { BuyAssetBySellIdInput, Swapper } from 'lib/swapper/types'
import { executeEvmTrade2 } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const oneInchSwapper: Swapper = {
  executeEvmTransaction: executeEvmTrade2,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
