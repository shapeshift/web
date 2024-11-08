import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { executeSolanaTransaction } from '../..'
import type { BuyAssetBySellIdInput, Swapper } from '../../types'
import { filterSameChainSolanaBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import type { JupiterSupportedChainId } from './types'
import { jupiterSupportedChainIds } from './utils/constants'

export const jupiterSwapper: Swapper = {
  executeSolanaTransaction,

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(
      assets
        .filter(asset => {
          const { chainId } = asset
          return jupiterSupportedChainIds.includes(chainId as JupiterSupportedChainId)
        })
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      filterSameChainSolanaBuyAssetsBySellAssetId(input)
        .filter(asset => {
          const { chainId } = asset
          return jupiterSupportedChainIds.includes(chainId as JupiterSupportedChainId)
        })
        .map(asset => asset.assetId),
    )
  },
}
