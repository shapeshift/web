import type { AssetId } from '@shapeshiftoss/caip'
import type { cosmos, osmosis } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const osmosisSwapper: Swapper2 = {
  executeTrade: async ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const adapter = assertGetCosmosSdkChainAdapter(chainId) as  // i.e not a THOR adapter
      | cosmos.ChainAdapter
      | osmosis.ChainAdapter

    const signedTx = await adapter.signTransaction({
      txToSign: txToSign as CosmosSignTx,
      wallet,
    })
    return adapter.broadcastTransaction(signedTx)
  },

  filterAssetIdsBySellable: (_assetIds: AssetId[]): Promise<AssetId[]> => {
    return Promise.resolve(filterAssetIdsBySellable())
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
