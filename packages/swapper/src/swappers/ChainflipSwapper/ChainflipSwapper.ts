import type { AssetId } from '@shapeshiftoss/caip'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput, Swapper, UtxoTransactionExecutionProps } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { CHAINFLIP_SUPPORTED_CHAIN_IDS } from './constants'
import { isSupportedAssetId } from './utils/helpers'

export const chainflipSwapper: Swapper = {
  executeEvmTransaction,

  executeUtxoTransaction: async (
    txToSign: BTCSignTx,
    { signAndBroadcastTransaction }: UtxoTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(
      assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.sell.includes(asset.chainId))
        .filter(asset => isSupportedAssetId(asset.chainId, asset.assetId))
        .map(asset => asset.assetId),
    )
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(
      input.assets
        .filter(asset => CHAINFLIP_SUPPORTED_CHAIN_IDS.buy.includes(asset.chainId))
        .filter(asset => isSupportedAssetId(asset.chainId, asset.assetId))
        .map(asset => asset.assetId),
    )
  },
}
