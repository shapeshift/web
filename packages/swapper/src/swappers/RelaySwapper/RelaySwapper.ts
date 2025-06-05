import type { Swapper } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'
import { filterRelayAssetIds } from './utils/filterRelayAssetIds'

export const relaySwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
  filterAssetIdsBySellable: assets => {
    return Promise.resolve(filterRelayAssetIds(assets).map(asset => asset.assetId))
  },
  filterBuyAssetsBySellAssetId: input => {
    return Promise.resolve(filterRelayAssetIds(input.assets).map(asset => asset.assetId))
  },
}
