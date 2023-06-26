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
import type { Result } from '@sniptt/monads/build'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  BuyAssetBySellIdInput,
  ExecuteTradeArgs,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper2,
  TradeQuote,
  TradeQuote2,
  UnsignedTx,
} from 'lib/swapper/api'
import { assertUnreachable, evm } from 'lib/utils'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import { selectFeeAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import type { Rates, ThorChainId, ThorUtxoSupportedChainId } from './ThorchainSwapper'
import { ThorchainSwapper } from './ThorchainSwapper'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

// Gets a from address either
// - derived from the input (for our own consumption with our AccountMetadata and ChainId structures)
// - or simply falls the passed from address through, for external consumers

type WithFromOrXpubParams = {
  chainId?: ChainId
  accountMetadata?: AccountMetadata
  wallet?: HDWallet
  from?: string
  xpub?: string
}

const withFromOrXpub =
  <T, P>(wrappedFunction: (params: P & { from?: string; xpub?: string }) => Promise<T>) =>
  async (params: WithFromOrXpubParams & P): Promise<T> => {
    const { chainId, accountMetadata, wallet, from: inputFrom, xpub: inputXpub } = params

    let from: string | undefined = inputFrom
    let xpub: string | undefined = inputXpub

    if (!from && !xpub) {
      if (!wallet) throw new Error('Wallet required for getAddress and getPublicKey calls')

      const chainAdapterManager = getChainAdapterManager()
      if (!chainId) throw new Error('No chainId provided')
      const adapter = chainAdapterManager.get(chainId) as ChainAdapter<ThorChainId>
      if (!adapter) throw new Error(`No adapter for ChainId: ${chainId}`)

      const accountNumber = accountMetadata?.bip44Params?.accountNumber
      const accountType = accountMetadata?.accountType

      if (!accountNumber) throw new Error('Account number required')
      if (isUtxoChainId(chainId)) {
        if (!accountType) throw new Error('Account number required')
        xpub = (
          await (adapter as UtxoChainAdapter).getPublicKey(wallet, accountNumber, accountType)
        ).xpub
      } else {
        from = await adapter.getAddress({ wallet, accountNumber })
      }
    }

    return wrappedFunction({ ...params, from, xpub })
  }

export const thorchain: Swapper2 = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    rates: Rates,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getThorTradeQuote(input, rates)

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = String(Date.now()) // TODO: get thorchain quote ID or use uuid

      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  // TODO: getUnsignedTx isn't consumed anywhere yet. When it is, move the HOF to the caller, so we keep the inner function pure
  getUnsignedTx: withFromOrXpub(
    async ({ accountMetadata, tradeQuote, from, xpub, supportsEIP1559 }): Promise<UnsignedTx> => {
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

      const chainSpecific =
        accountType && xpub
          ? {
              xpub,
              accountType,
              satoshiPerByte: (tradeQuote as TradeQuote<ThorUtxoSupportedChainId>).steps[0].feeData
                .chainSpecific.satsPerByte,
            }
          : undefined

      const fromOrXpub = from ? { from } : { xpub: xpub! }
      return await getSignTxFromQuote({
        tradeQuote,
        receiveAddress,
        affiliateBps,
        chainSpecific,
        buyAssetUsdRate,
        ...fromOrXpub,
        feeAssetUsdRate,
        supportsEIP1559,
      })
    },
  ),

  executeTrade: async ({ txToSign, wallet, chainId }: ExecuteTradeArgs): Promise<string> => {
    const { chainNamespace } = fromChainId(chainId)
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const evmChainAdapter = adapter as unknown as EvmChainAdapter
        return evm.broadcast({
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
