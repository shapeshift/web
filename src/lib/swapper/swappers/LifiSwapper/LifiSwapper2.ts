import type { AssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import { signAndBroadcast } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterCrossChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const lifiSwapper: Swapper2 = {
  executeTrade: ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as unknown as EvmChainAdapter

    return signAndBroadcast({ adapter, wallet, txToSign: txToSign as ETHSignTx })
  },

  filterAssetIdsBySellable: (assetIds: AssetId[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assetIds))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterCrossChainEvmBuyAssetsBySellAssetId(input))
  },
}
