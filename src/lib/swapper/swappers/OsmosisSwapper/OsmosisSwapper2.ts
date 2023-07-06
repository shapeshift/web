import type { AssetId } from '@shapeshiftoss/caip'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import { assertGetEvmChainAdapter, signAndBroadcast } from 'lib/utils/evm'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const osmosisSwapper: Swapper2 = {
  executeTrade: ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const adapter = assertGetEvmChainAdapter(chainId)
    return signAndBroadcast({ adapter, wallet, txToSign: txToSign as ETHSignTx })
  },

  filterAssetIdsBySellable: (_assetIds: AssetId[]): Promise<AssetId[]> => {
    return Promise.resolve(filterAssetIdsBySellable())
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
