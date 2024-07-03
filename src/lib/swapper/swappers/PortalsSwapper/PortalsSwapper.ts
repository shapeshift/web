import type { AssetId } from '@shapeshiftoss/caip'
import type { BuyAssetBySellIdInput, Swapper } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { executeEvmTransaction } from 'lib/utils/evm'

import { PORTALS_SUPPORTED_CHAIN_IDS } from './utils/constants'

export const portalsSwapper: Swapper = {
  executeEvmTransaction,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(
      assets
        .filter(asset => PORTALS_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      input.assets
        .filter(asset => PORTALS_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
}
