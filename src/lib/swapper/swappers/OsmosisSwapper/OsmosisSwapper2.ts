import type { AssetId } from '@shapeshiftoss/caip'
import type { cosmos, osmosis } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const osmosisSwapper: Swapper2 = {
  executeTrade: async ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)

    const cosmosSdkChainAdapter = adapter as unknown as cosmos.ChainAdapter | osmosis.ChainAdapter
    const signedTx = await cosmosSdkChainAdapter.signTransaction({
      txToSign: txToSign as CosmosSignTx,
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
