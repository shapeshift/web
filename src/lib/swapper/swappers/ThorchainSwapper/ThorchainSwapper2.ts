import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  EvmChainId,
  SignTx,
  UtxoChainAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import type { ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import { assertUnreachable, evm } from 'lib/utils'

import { ThorchainSwapper } from './ThorchainSwapper'

export const thorchainSwapper: Swapper2 = {
  executeTrade: async ({ txToSign, wallet, chainId }: ExecuteTradeArgs): Promise<string> => {
    const { chainNamespace } = fromChainId(chainId)
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const evmChainAdapter = adapter as unknown as EvmChainAdapter
        return evm.signAndBroadcast({
          adapter: evmChainAdapter,
          txToSign: txToSign as SignTx<EvmChainId>,
          wallet,
        })
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
    const thorchainSwapper = new ThorchainSwapper()
    await thorchainSwapper.initialize()
    return thorchainSwapper.filterAssetIdsBySellable()
  },

  filterBuyAssetsBySellAssetId: async (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    const thorchainSwapper = new ThorchainSwapper()
    await thorchainSwapper.initialize()
    return thorchainSwapper.filterBuyAssetsBySellAssetId(input)
  },
}
