import { executeSolanaTransaction } from '../..'
import type { Swapper } from '../../types'
import { JUPITER_ERRORS, SolanaLogsError } from './errorPatterns'
import { jupiterSupportedChainIds } from './utils/constants'

export const jupiterSwapper: Swapper = {
  executeSolanaTransaction: async (txToSign, callbacks) => {
    try {
      const txid = await executeSolanaTransaction(txToSign, callbacks)
      return txid
    } catch (e) {
      if (e instanceof Error) {
        const errorMessage = e.message
        const swapperErrorType = Object.keys(JUPITER_ERRORS).reduce(
          (acc, errorPattern) => {
            if (errorMessage.includes(errorPattern)) {
              acc = JUPITER_ERRORS[errorPattern]
            }

            return acc
          },
          undefined as undefined | string,
        )

        if (swapperErrorType) throw new SolanaLogsError(swapperErrorType)
      }

      throw e
    }
  },
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(
      assets
        .filter(asset => jupiterSupportedChainIds.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
  filterBuyAssetsBySellAssetId: input => {
    return Promise.resolve(
      input.assets
        .filter(asset => jupiterSupportedChainIds.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
}
