import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId, thorchainAssetId } from '@shapeshiftoss/caip'
import type {
  ChainAdapter,
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  EvmChainId,
  SignTx,
  UtxoChainAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import type { HDWallet, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  BuyAssetBySellIdInput,
  ExecuteTradeArgs,
  Swapper2,
  TradeQuote,
  UnsignedTx,
} from 'lib/swapper/api'
import { assertUnreachable, evm } from 'lib/utils'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import { selectFeeAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import type { ThorChainId, ThorUtxoSupportedChainId } from './ThorchainSwapper'
import { ThorchainSwapper } from './ThorchainSwapper'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

// Gets a from addresss either
// - derived from the input (for our own consumption with our AccountMetadata and ChainId structures)
// - or simply falls the passed from address through, for external consumers
type WithFromParams = {
  chainId?: ChainId
  accountMetadata?: AccountMetadata
  wallet?: HDWallet
  from?: string
}

export const withFrom =
  <T, P>(wrappedFunction: (params: P & { from: string | undefined }) => Promise<T>) =>
  async (params: P & WithFromParams): Promise<T> => {
    const { chainId, accountMetadata, from: inputFrom, wallet } = params

    let from: string | undefined
    if (inputFrom) {
      from = inputFrom
    } else {
      const chainAdapterManager = getChainAdapterManager()
      if (!chainId) throw new Error('No chainId provided')
      const adapter = chainAdapterManager.get(chainId) as ChainAdapter<ThorChainId>
      if (!adapter) throw new Error(`No adapter for ChainId: ${chainId}`)
      const accountNumber = accountMetadata?.bip44Params?.accountNumber
      const accountType = accountMetadata?.accountType

      from = await (async () => {
        if (!wallet) throw new Error('Wallet required for adapter.getAddress() call')
        if (!accountNumber) throw new Error('Account number required for adapter.getAddress() call')
        if (!isUtxoChainId(chainId)) return adapter.getAddress({ wallet, accountNumber })
        if (!accountType || !accountNumber) return undefined
        const { xpub } = await (adapter as UtxoChainAdapter).getPublicKey(
          wallet,
          accountNumber,
          accountType,
        )
        return xpub
      })()
    }

    return wrappedFunction({ ...params, from })
  }

export const thorchain: Swapper2 = {
  getTradeQuote: getThorTradeQuote,

  getUnsignedTx: withFrom(
    async ({
      accountMetadata,
      tradeQuote,
      chainId,
      from,
      supportsEIP1559,
    }): Promise<UnsignedTx> => {
      const chainAdapterManager = getChainAdapterManager()
      if (!chainId) throw new Error('No chainId provided')
      const adapter = chainAdapterManager.get(chainId) as ChainAdapter<ThorChainId>
      if (!adapter) throw new Error(`No adapter for ChainId: ${chainId}`)

      const { receiveAddress, affiliateBps } = tradeQuote
      const feeAsset = selectFeeAssetById(store.getState(), tradeQuote.steps[0].sellAsset.assetId)
      const buyAssetUsdRate = selectUsdRateByAssetId(
        store.getState(),
        tradeQuote.steps[0].buyAsset.assetId,
      )
      const feeAssetUsdRate = feeAsset
        ? selectUsdRateByAssetId(store.getState(), feeAsset.assetId)
        : undefined

      if (!buyAssetUsdRate) throw Error('missing buy asset usd rate')
      if (!feeAssetUsdRate) throw Error('missing fee asset usd rate')

      const accountType = accountMetadata?.accountType
      const xpub = from // TODO: question - why are we mixing these?

      const chainSpecific =
        accountType && xpub
          ? {
              xpub,
              accountType,
              satoshiPerByte: (tradeQuote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
                .chainSpecific.satsPerByte,
            }
          : undefined

      return await getSignTxFromQuote({
        tradeQuote,
        receiveAddress,
        affiliateBps,
        chainSpecific,
        buyAssetUsdRate,
        feeAssetUsdRate,
        from,
        supportsEIP1559,
      })
    },
  ),

  executeTrade: async ({ txToExecute, wallet, chainId }: ExecuteTradeArgs): Promise<string> => {
    const { chainNamespace } = fromChainId(chainId)
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const evmChainAdapter = adapter as unknown as EvmChainAdapter
        return evm.broadcast({
          adapter: evmChainAdapter,
          txToSign: txToExecute as SignTx<EvmChainId>,
          wallet,
        })
      }

      case CHAIN_NAMESPACE.CosmosSdk: {
        const cosmosSdkChainAdapter = adapter as unknown as CosmosSdkChainAdapter
        const signedTx = await cosmosSdkChainAdapter.signTransaction({
          txToSign: txToExecute as ThorchainSignTx,
          wallet,
        })
        return cosmosSdkChainAdapter.broadcastTransaction(signedTx)
      }

      case CHAIN_NAMESPACE.Utxo: {
        const utxoChainAdapter = adapter as unknown as UtxoChainAdapter
        const signedTx = await utxoChainAdapter.signTransaction({
          txToSign: txToExecute as SignTx<UtxoChainId>,
          wallet,
        })
        return utxoChainAdapter.broadcastTransaction(signedTx)
      }

      default:
        assertUnreachable(chainNamespace)
    }
  },

  checkTradeStatus: async (txId: string): Promise<{ isComplete: boolean; message?: string }> => {
    const thorchainSwapper = new ThorchainSwapper()
    const txsResult = await thorchainSwapper.getTradeTxs({ tradeId: txId })
    return {
      isComplete: txsResult.isOk() && !!txsResult.unwrap().buyTxid,
    }
  },

  filterAssetIdsBySellable: (): AssetId[] => {
    return [thorchainAssetId]
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): AssetId[] => {
    const thorchainSwapper = new ThorchainSwapper()
    return thorchainSwapper.filterBuyAssetsBySellAssetId(input)
  },
}
