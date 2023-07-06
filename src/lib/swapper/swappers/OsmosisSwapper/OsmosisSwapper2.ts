import type { AssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainAdapter } from '@shapeshiftoss/chain-adapters'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const osmosisSwapper: Swapper2 = {
  executeTrade: async ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)

    const cosmosSdkChainAdapter = adapter as unknown as CosmosSdkChainAdapter
    const signedTx = await cosmosSdkChainAdapter.signTransaction({
      txToSign,
      wallet,
    })
    return cosmosSdkChainAdapter.broadcastTransaction(signedTx)
  },

  filterAssetIdsBySellable: (_assetIds: AssetId[]): Promise<AssetId[]> => {
    return Promise.resolve(filterAssetIdsBySellable())
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
