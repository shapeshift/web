import type { StdSignDoc } from '@keplr-wallet/types'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { getConfig } from 'config'
import {
  buySupportedChainIds,
  sellSupportedChainIds,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { ThorChainId, ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import type {
  BuyAssetBySellIdInput,
  CosmosSdkTransactionExecutionProps,
  Swapper,
  UtxoTransactionExecutionProps,
} from 'lib/swapper/types'
import { executeEvmTransaction } from 'lib/utils/evm'

const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL

export const thorchainSwapper: Swapper = {
  executeEvmTransaction,

  executeCosmosSdkTransaction: async (
    txToSign: StdSignDoc,
    { signAndBroadcastTransaction }: CosmosSdkTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },

  executeUtxoTransaction: async (
    txToSign: BTCSignTx,
    { signAndBroadcastTransaction }: UtxoTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },

  filterAssetIdsBySellable: async (): Promise<AssetId[]> => {
    let supportedSellAssetIds: AssetId[] = [thorchainAssetId]
    const poolResponse = await thorService.get<ThornodePoolResponse[]>(
      `${daemonUrl}/lcd/thorchain/pools`,
    )
    if (poolResponse.isOk()) {
      const allPools = poolResponse.unwrap().data
      const availablePools = allPools.filter(pool => pool.status === 'Available')

      availablePools.forEach(pool => {
        const assetId = poolAssetIdToAssetId(pool.asset)
        if (!assetId) return

        const chainId = fromAssetId(assetId).chainId as ThorChainId
        sellSupportedChainIds[chainId] && supportedSellAssetIds.push(assetId)
      })
    }
    return supportedSellAssetIds
  },

  filterBuyAssetsBySellAssetId: async ({
    assets,
    sellAsset,
  }: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    let supportedSellAssetIds: AssetId[] = [thorchainAssetId]
    let supportedBuyAssetIds: AssetId[] = [thorchainAssetId]
    const poolResponse = await thorService.get<ThornodePoolResponse[]>(
      `${daemonUrl}/lcd/thorchain/pools`,
    )
    if (poolResponse.isOk()) {
      const allPools = poolResponse.unwrap().data
      const availablePools = allPools.filter(pool => pool.status === 'Available')

      availablePools.forEach(pool => {
        const assetId = poolAssetIdToAssetId(pool.asset)
        if (!assetId) return

        const chainId = fromAssetId(assetId).chainId as ThorChainId
        sellSupportedChainIds[chainId] && supportedSellAssetIds.push(assetId)
        buySupportedChainIds[chainId] && supportedBuyAssetIds.push(assetId)
      })
    }
    if (!supportedSellAssetIds.includes(sellAsset.assetId)) return []
    return assets
      .filter(
        asset =>
          supportedBuyAssetIds.includes(asset.assetId) && asset.assetId !== sellAsset.assetId,
      )
      .map(asset => asset.assetId)
  },
}
