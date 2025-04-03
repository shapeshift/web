import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import {
  filterCrossChainEvmBuyAssetsBySellAssetId,
  filterSameChainEvmBuyAssetsBySellAssetId,
} from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const relaySwapper: Swapper = {
  executeEvmTransaction,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    // @TODO: change this util name when we support something else than EVM chains (BTC and Solana)
    return Promise.resolve(filterEvmAssetIdsBySellable(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      [
        // @TODO: change this util name when we support something else than EVM chains (BTC and Solana)
        ...filterCrossChainEvmBuyAssetsBySellAssetId(input),
        // @TODO: change this util name when we support something else than EVM chains (BTC and Solana)
        ...filterSameChainEvmBuyAssetsBySellAssetId(input),
      ].map(asset => asset.assetId),
    )
  },
}
