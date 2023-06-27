import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId, thorchainAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  EvmChainId,
  SignTx,
  UtxoChainAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import type { ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
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
import { selectFeeAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import type { Rates, ThorUtxoSupportedChainId } from './ThorchainSwapper'
import { ThorchainSwapper } from './ThorchainSwapper'
import { getSignTxFromQuote } from './utils/getSignTxFromQuote'

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

  getUnsignedTx: async ({
    accountMetadata,
    tradeQuote,
    from,
    xpub,
    supportsEIP1559,
  }): Promise<UnsignedTx> => {
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

    const fromOrXpub = from !== undefined ? { from } : { xpub }
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

  checkTradeStatus: async (
    tradeId: string,
  ): Promise<{ status: TxStatus; buyTxId: string | undefined; message: string | undefined }> => {
    const thorchainSwapper = new ThorchainSwapper()
    const txsResult = await thorchainSwapper.getTradeTxs({ tradeId })

    const status = (() => {
      switch (true) {
        case txsResult.isOk() && !!txsResult.unwrap().buyTxid:
          return TxStatus.Confirmed
        case txsResult.isOk() && !txsResult.unwrap().buyTxid:
          return TxStatus.Pending
        case txsResult.isErr():
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return {
      buyTxId: txsResult.isOk() ? txsResult.unwrap().buyTxid : undefined,
      status,
      message: undefined,
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
