import type { AssetId } from '@shapeshiftoss/caip'
import type { SignTx } from '@shapeshiftoss/chain-adapters'
import type { Asset, UtxoChainId } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper, UtxoTransactionExecutionProps } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'
import { filterRelayAssetIds } from './utils/filterRelayAssetIds'

export const relaySwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeUtxoTransaction: (
    txToSign: SignTx<UtxoChainId>,
    { signAndBroadcastTransaction }: UtxoTransactionExecutionProps,
  ): Promise<string> => {
    return signAndBroadcastTransaction(txToSign)
  },

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterRelayAssetIds(assets).map(asset => asset.assetId))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterRelayAssetIds(input.assets).map(asset => asset.assetId))
  },
}
