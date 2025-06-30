import type { Swapper } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'
import { BUTTERSWAP_SUPPORTED_CHAIN_IDS } from './utils/constants'

export const butterSwap: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(
      assets
        .filter(asset => BUTTERSWAP_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: input => {
    return Promise.resolve(
      input.assets
        .filter(asset => BUTTERSWAP_SUPPORTED_CHAIN_IDS.buy.includes(asset.chainId))
        .map(asset => asset.assetId),
    )
  },
}
