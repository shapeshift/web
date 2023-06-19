import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter, SignTx, UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Ok } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build/result/result'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Swapper3, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import { selectFeeAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { store } from 'state/store'

import { buildTradeFromQuote } from './buildThorTrade/buildThorTrade'
import type {
  ThorChainId,
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorTrade,
  ThorUtxoSupportedChainId,
} from './ThorchainSwapper'

export const thorchain: Swapper3 = {
  getUnsignedTx: async (
    tradeQuote: TradeQuote<ThorChainId> & { receiveAddress: string; affiliateBps: string },
    wallet: HDWallet,
    chainId: ThorChainId,
    accountMetadata: AccountMetadata,
  ) => {
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId) as ChainAdapter<ThorChainId>
    if (!adapter) throw new Error(`No adapter for ChainId: ${chainId}`)
    const { bip44Params, accountType } = accountMetadata
    const xpub = await (async () => {
      if (!isUtxoChainId(chainId) || !accountType) return undefined
      const { xpub } = await (adapter as UtxoChainAdapter).getPublicKey(
        wallet,
        bip44Params.accountNumber,
        accountType,
      )
      return xpub
    })()

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
      wallet,
      receiveAddress,
      affiliateBps,
      xpub,
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
        return Ok(txToSign)
      } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
        const txToSign = (trade as ThorTrade<ThorUtxoSupportedChainId>)
          .txData as SignTx<ThorUtxoSupportedChainId>
        return Ok(txToSign)
      } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
        const txToSign = (trade as ThorTrade<ThorCosmosSdkSupportedChainId>)
          .txData as SignTx<ThorCosmosSdkSupportedChainId>
        return Ok(txToSign)
      } else {
        return Err(
          makeSwapErrorRight({
            message: '[executeTrade]: unsupported trade',
            code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
          }),
        )
      }
    } catch (e) {
      if (e instanceof SwapError) throw e
      throw new SwapError('[executeTrade]: failed to sign or broadcast', {
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
        cause: e,
      })
    }
  },
  executeTrade: async ({ txToExecute, wallet }) => {},
}
