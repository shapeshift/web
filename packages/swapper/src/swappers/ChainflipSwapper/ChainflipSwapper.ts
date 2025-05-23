import type { Swapper } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'
import { CHAINFLIP_SUPPORTED_CHAIN_IDS } from './constants'
import { isSupportedAssetId } from './utils/helpers'

export const chainflipSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(
      assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .filter(asset => isSupportedAssetId(asset.chainId, asset.assetId))
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: input => {
    return Promise.resolve(
      input.assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.buy.includes(asset.chainId))
        .filter(asset => isSupportedAssetId(asset.chainId, asset.assetId))
        .map(asset => asset.assetId),
    )
  },
}
