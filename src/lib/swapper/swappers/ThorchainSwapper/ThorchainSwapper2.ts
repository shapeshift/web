import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter, SignTx, UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BuyAssetBySellIdInput, Swapper2, UnsignedTx } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import { selectFeeAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { buildTradeFromQuote } from './buildThorTrade/buildThorTrade'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import type {
  ThorChainId,
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorTrade,
  ThorUtxoSupportedChainId,
} from './ThorchainSwapper'
import { ThorchainSwapper } from './ThorchainSwapper'

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

  getUnsignedTx: withFrom(async ({ tradeQuote, chainId, from }): Promise<UnsignedTx> => {
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

    const maybeTrade = await buildTradeFromQuote({
      tradeQuote,
      receiveAddress,
      affiliateBps,
      from,
      accountType,
      buyAssetUsdRate,
      feeAssetUsdRate,
    })

    if (maybeTrade.isErr()) throw maybeTrade.unwrapErr()
    const trade = maybeTrade.unwrap()

    try {
      const chainAdapterManager = getChainAdapterManager()
      const { chainNamespace, chainId } = fromAssetId(trade.sellAsset.assetId)
      const adapter = chainAdapterManager.get(chainId)

      if (!adapter) {
        throw new SwapError('[executeTrade]: no adapter for sell asset chain id', {
          code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
          details: { chainId },
          fn: 'executeTrade',
        })
      }

      if (chainNamespace === CHAIN_NAMESPACE.Evm) {
        const txToSign = (trade as ThorTrade<ThorEvmSupportedChainId>)
          .txData as SignTx<ThorEvmSupportedChainId>
        return txToSign
      } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
        const txToSign = (trade as ThorTrade<ThorUtxoSupportedChainId>)
          .txData as SignTx<ThorUtxoSupportedChainId>
        return txToSign
      } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
        const txToSign = (trade as ThorTrade<ThorCosmosSdkSupportedChainId>)
          .txData as SignTx<ThorCosmosSdkSupportedChainId>
        return txToSign
      } else {
        throw new SwapError('[executeTrade]: unsupported chainNamespace', {
          code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
          details: { chainNamespace },
        })
      }
    } catch (e) {
      throw new SwapError('[executeTrade]: failed to sign or broadcast', {
        cause: e,
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      })
    }
  }),

  executeTrade: async ({
    tradeQuote,
    wallet,
    affiliateBps,
    receiveAddress,
    xpub,
    accountType,
  }: ExecuteTradeInput2): Promise<string> => {
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

    const trade = await buildTradeFromQuote({
      tradeQuote,
      wallet,
      receiveAddress,
      affiliateBps,
      xpub,
      accountType,
      buyAssetUsdRate,
      feeAssetUsdRate,
    })

    if (trade.isErr()) throw trade.unwrapErr()

    const thorchainSwapper = new ThorchainSwapper()
    const executeTradeResult = await thorchainSwapper.executeTrade({
      trade: trade.unwrap(),
      wallet,
    })
    if (executeTradeResult.isErr()) throw executeTradeResult.unwrapErr()

    return executeTradeResult.unwrap().tradeId
  },

  checkTradeStatus: async (txId: string): Promise<{ isComplete: boolean; message?: string }> => {
    const txsResult = await getTradeTxs(txId)
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
