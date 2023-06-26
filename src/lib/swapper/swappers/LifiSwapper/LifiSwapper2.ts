import type { AssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterCrossChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const lifi: Swapper2 = {
  executeTrade: async ({ txToExecute, wallet, chainId }: ExecuteTradeArgs) => {
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as unknown as ChainAdapter<EvmChainId>

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({
        txToSign: txToExecute as ETHSignTx,
        wallet,
      })

      const txid = await adapter.broadcastTransaction(signedTx)

      return txid
    }

    if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txToExecute as ETHSignTx,
        wallet,
      })

      return txid
    }

    throw Error('sign and broadcast failed')
  },

  filterAssetIdsBySellable: (assetIds: AssetId[]): AssetId[] => {
    return filterEvmAssetIdsBySellable(assetIds)
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): AssetId[] => {
    return filterCrossChainEvmBuyAssetsBySellAssetId(input)
  },
}
