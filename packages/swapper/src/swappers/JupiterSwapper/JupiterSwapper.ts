import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { executeSolanaTransaction } from '../..'
import type { BuyAssetBySellIdInput, Swapper } from '../../types'
import { JUPITER_ERRORS, SolanaLogsError } from './errorPatterns'
import { jupiterSupportedChainIds } from './utils/constants'

export const jupiterSwapper: Swapper = {
  executeSolanaTransaction: async (...args) => {
    try {
      const txid = await executeSolanaTransaction(...args)
      return txid
    } catch (e) {
      if (e instanceof Error) {
        const errorMessage = e.message
        const swapperError = Object.keys(JUPITER_ERRORS).reduce(
          (acc, errorPattern) => {
            if (errorMessage.includes(errorPattern)) {
              acc = JUPITER_ERRORS[errorPattern]
            }

            return acc
          },
          undefined as undefined | string,
        )

        if (swapperError) throw new SolanaLogsError(swapperError)
      }

      throw e
    }
  },

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(
      assets
        .filter(asset => {
          const { chainId } = asset
          return jupiterSupportedChainIds.includes(chainId)
        })
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      input.assets
        .filter(asset => {
          const { chainId } = asset
          return jupiterSupportedChainIds.includes(chainId)
        })
        .map(asset => asset.assetId),
    )
  },
}
