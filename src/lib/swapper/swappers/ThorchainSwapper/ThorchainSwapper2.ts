import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId, fromChainId, thorchainAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainAdapter,
  SignTx,
  UtxoChainAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import type { ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import {
  buySupportedChainIds,
  sellSupportedChainIds,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { ThorChainId, ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { assertUnreachable } from 'lib/utils'
import { executeEvmTrade } from 'lib/utils/evm'

const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL

export const thorchainSwapper: Swapper2 = {
  executeTrade: async ({ txToSign, wallet, chainId }: ExecuteTradeArgs): Promise<string> => {
    const { chainNamespace } = fromChainId(chainId)
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        return executeEvmTrade({ txToSign, wallet, chainId })
      }

      case CHAIN_NAMESPACE.CosmosSdk: {
        const cosmosSdkChainAdapter = adapter as unknown as CosmosSdkChainAdapter
        const signedTx = await cosmosSdkChainAdapter.signTransaction({
          txToSign: txToSign as ThorchainSignTx,
          wallet,
        })
        return cosmosSdkChainAdapter.broadcastTransaction(signedTx)
      }

      case CHAIN_NAMESPACE.Utxo: {
        const utxoChainAdapter = adapter as unknown as UtxoChainAdapter
        const signedTx = await utxoChainAdapter.signTransaction({
          txToSign: txToSign as SignTx<UtxoChainId>,
          wallet,
        })
        return utxoChainAdapter.broadcastTransaction(signedTx)
      }

      default:
        assertUnreachable(chainNamespace)
    }
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
