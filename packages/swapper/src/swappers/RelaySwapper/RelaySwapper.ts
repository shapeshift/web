import type { AssetId } from '@shapeshiftoss/caip'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper, UtxoTransactionExecutionProps } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { filterRelayAssetIds } from './utils/filterRelayAssetIds'

export const RELAY_TRADE_POLL_INTERVAL_MILLISECONDS = 30_000
export const RELAY_GET_TRADE_QUOTE_POLLING_INTERVAL = 30_000

export const relaySwapper: Swapper = {
  executeEvmTransaction,
  executeUtxoTransaction: async (
    txToSign: BTCSignTx,
    { signAndBroadcastTransaction }: UtxoTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },
  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterRelayAssetIds(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterRelayAssetIds(input.assets).map(asset => asset.assetId))
  },
}
