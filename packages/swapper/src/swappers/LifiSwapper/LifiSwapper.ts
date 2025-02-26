import type { AssetId } from '@shapeshiftoss/caip'
import { optimismChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import {
  filterCrossChainEvmBuyAssetsBySellAssetId,
  filterSameChainEvmBuyAssetsBySellAssetId,
} from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const LIFI_TRADE_POLL_INTERVAL_MILLISECONDS = 30_000
export const LIFI_GET_TRADE_QUOTE_POLLING_INTERVAL = 60_000

export const lifiSwapper: Swapper = {
  executeEvmTransaction,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      [
        ...filterCrossChainEvmBuyAssetsBySellAssetId(input),
        // TODO(gomes): This is weird but a temporary product compromise to accommodate for the fact that OP rewards have weird heuristics
        // and would detect same-chain swaps on Li.Fi as cross-chain swaps, making the rewards gameable by same-chain swaps
        // Remove me when OP rewards ends
        ...filterSameChainEvmBuyAssetsBySellAssetId(input).filter(
          asset => asset.chainId !== optimismChainId,
        ),
      ].map(asset => asset.assetId),
    )
  },
}
