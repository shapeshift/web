import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import type { BuyAssetBySellIdInput, Swapper2 } from 'lib/swapper/api'
import { executeEvmTrade } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import type { ZrxSupportedChainId } from './types'
import { ZRX_SUPPORTED_CHAINIDS, ZRX_UNSUPPORTED_ASSETS } from './utils/constants'

export const zrxSwapper: Swapper2 = {
  executeTrade: executeEvmTrade,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(
      filterEvmAssetIdsBySellable(assets)
        .filter(asset => {
          const { assetId, chainId } = asset
          return (
            !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
            ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
          )
        })
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      filterSameChainEvmBuyAssetsBySellAssetId(input)
        .filter(asset => {
          const { assetId, chainId } = asset
          return (
            !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
            ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
          )
        })
        .map(asset => asset.assetId),
    )
  },
}
