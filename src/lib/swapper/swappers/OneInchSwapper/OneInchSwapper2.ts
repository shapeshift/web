import type { AssetId } from '@shapeshiftoss/caip'
import type { BuyAssetBySellIdInput, Swapper2 } from 'lib/swapper/api'
import { executeEvmTrade } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const oneInchSwapper: Swapper2 = {
  executeTrade: executeEvmTrade,

  filterAssetIdsBySellable: (assetIds: AssetId[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assetIds))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
