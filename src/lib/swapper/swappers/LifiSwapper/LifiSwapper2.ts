import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, optimismChainId } from '@shapeshiftoss/caip'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import { assertGetEvmChainAdapter, signAndBroadcast } from 'lib/utils/evm'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import {
  filterCrossChainEvmBuyAssetsBySellAssetId,
  filterSameChainEvmBuyAssetsBySellAssetId,
} from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'

export const lifiSwapper: Swapper2 = {
  executeTrade: ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const adapter = assertGetEvmChainAdapter(chainId)
    return signAndBroadcast({ adapter, wallet, txToSign: txToSign as ETHSignTx })
  },

  filterAssetIdsBySellable: (assetIds: AssetId[]): Promise<AssetId[]> => {
    return Promise.resolve(filterEvmAssetIdsBySellable(assetIds))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve([
      ...filterCrossChainEvmBuyAssetsBySellAssetId(input),
      // TODO(gomes): This is weird but a temporary product compromise to accomodate for the fact that OP rewards have weird heuristics
      // and would detect same-chain swaps on Li.Fi as cross-chain swaps, making the rewards gameable by same-chain swaps
      // Remove me when OP rewards ends
      ...filterSameChainEvmBuyAssetsBySellAssetId(input).filter(
        assetId => fromAssetId(assetId).chainId !== optimismChainId,
      ),
    ])
  },
}
