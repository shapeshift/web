import type { AssetId } from '@shapeshiftoss/caip'
import type { BuyAssetBySellIdInput, Swapper2 } from 'lib/swapper/api'
import { executeEvmTrade } from 'lib/utils/evm'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import type { ZrxSupportedChainId } from './types'
import { ZRX_SUPPORTED_CHAINIDS, ZRX_UNSUPPORTED_ASSETS } from './utils/constants'

export const zrxSwapper: Swapper2 = {
  executeTrade: executeEvmTrade,

  filterAssetIdsBySellable: (assetIds: AssetId[]): Promise<AssetId[]> => {
    const assets = selectAssets(store.getState())
    return Promise.resolve(
      filterEvmAssetIdsBySellable(assetIds).filter(assetId => {
        const asset = assets[assetId]
        if (asset === undefined) return false
        const { chainId } = asset
        return (
          !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
          ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
        )
      }),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    const assets = selectAssets(store.getState())
    return Promise.resolve(
      filterSameChainEvmBuyAssetsBySellAssetId(input).filter(assetId => {
        const asset = assets[assetId]
        if (asset === undefined) return false
        const { chainId } = asset
        return (
          !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
          ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
        )
      }),
    )
  },
}
