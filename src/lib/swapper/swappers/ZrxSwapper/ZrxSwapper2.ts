import type { AssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import { signAndBroadcast } from 'lib/utils/evm'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import type { ZrxSupportedChainId } from './types'
import { ZRX_SUPPORTED_CHAINIDS, ZRX_UNSUPPORTED_ASSETS } from './utils/constants'

export const zrxSwapper: Swapper2 = {
  executeTrade: ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as unknown as EvmChainAdapter

    return signAndBroadcast({ adapter, wallet, txToSign: txToSign as ETHSignTx })
  },

  filterAssetIdsBySellable: (assetIds: AssetId[]): Promise<AssetId[]> => {
    const assets = selectAssets(store.getState())
    return Promise.resolve(
      filterEvmAssetIdsBySellable(assetIds).filter(assetId => {
        const asset = assets[assetId]
        if (asset === undefined) return false
        const { chainId } = asset
        return (
          !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
          ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
        )
      }),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    const assets = selectAssets(store.getState())
    return Promise.resolve(
      filterSameChainEvmBuyAssetsBySellAssetId(input).filter(assetId => {
        const asset = assets[assetId]
        if (asset === undefined) return false
        const { chainId } = asset
        return (
          !ZRX_UNSUPPORTED_ASSETS.includes(assetId) &&
          ZRX_SUPPORTED_CHAINIDS.includes(chainId as ZrxSupportedChainId)
        )
      }),
    )
  },
}
