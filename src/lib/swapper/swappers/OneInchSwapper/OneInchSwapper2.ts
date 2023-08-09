import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import type { BuyAssetBySellIdInput, Swapper2 } from 'lib/swapper/api'
import { executeEvmTrade } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const oneInchSwapper: Swapper2 = {
  executeTrade: executeEvmTrade,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
