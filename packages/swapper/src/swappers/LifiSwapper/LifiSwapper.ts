import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterCrossChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const LIFI_TRADE_POLL_INTERVAL_MILLISECONDS = 30_000
export const LIFI_GET_TRADE_QUOTE_POLLING_INTERVAL = 60_000

export const lifiSwapper: Swapper = {
  executeEvmTransaction,
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assets).map(asset => asset.assetId))
  },
  filterBuyAssetsBySellAssetId: input => {
    return Promise.resolve(
      filterCrossChainEvmBuyAssetsBySellAssetId(input).map(asset => asset.assetId),
    )
  },
}
