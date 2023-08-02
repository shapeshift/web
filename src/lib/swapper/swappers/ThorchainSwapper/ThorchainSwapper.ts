import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, SignTx, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { buildTrade } from 'lib/swapper/swappers/ThorchainSwapper/buildThorTrade/buildThorTrade'
import { getThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import type {
  MidgardActionsResponse,
  ThorChainId,
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainAdapter,
  ThorEvmSupportedChainId,
  ThornodePoolResponse,
  ThorTrade,
  ThorUtxoSupportedChainId,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { signAndBroadcast } from 'lib/utils/evm'
import {
  selectBuyAssetUsdRate,
  selectFeeAssetUsdRate,
  selectSellAssetUsdRate,
} from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import { makeSwapErrorRight, SwapError, SwapErrorType, SwapperName } from '../../api'

export class ThorchainSwapper implements Swapper<ThorChainId> {
  readonly name = SwapperName.Thorchain

  private sellSupportedChainIds: Record<ThorChainId, boolean> = {
    [KnownChainIds.EthereumMainnet]: true,
    [KnownChainIds.BitcoinMainnet]: true,
    [KnownChainIds.DogecoinMainnet]: true,
    [KnownChainIds.LitecoinMainnet]: true,
    [KnownChainIds.BitcoinCashMainnet]: true,
    [KnownChainIds.CosmosMainnet]: true,
    [KnownChainIds.ThorchainMainnet]: true,
    [KnownChainIds.AvalancheMainnet]: true,
  }

  private buySupportedChainIds: Record<ThorChainId, boolean> = {
    [KnownChainIds.EthereumMainnet]: true,
    [KnownChainIds.BitcoinMainnet]: true,
    [KnownChainIds.DogecoinMainnet]: true,
    [KnownChainIds.LitecoinMainnet]: true,
    [KnownChainIds.BitcoinCashMainnet]: true,
    [KnownChainIds.CosmosMainnet]: true,
    [KnownChainIds.ThorchainMainnet]: true,
    [KnownChainIds.AvalancheMainnet]: true,
  }

  private supportedSellAssetIds: AssetId[] = [thorchainAssetId]
  private supportedBuyAssetIds: AssetId[] = [thorchainAssetId]

  async initialize() {
    try {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      return (
        await thorService.get<ThornodePoolResponse[]>(`${daemonUrl}/lcd/thorchain/pools`)
      ).andThen(({ data: allPools }) => {
        const availablePools = allPools.filter(pool => pool.status === 'Available')

        availablePools.forEach(pool => {
          const assetId = poolAssetIdToAssetId(pool.asset)
          if (!assetId) return

          const chainId = fromAssetId(assetId).chainId as ThorChainId

          this.sellSupportedChainIds[chainId] && this.supportedSellAssetIds.push(assetId)
          this.buySupportedChainIds[chainId] && this.supportedBuyAssetIds.push(assetId)
        })

        return Ok(undefined)
      })
    } catch (e: unknown) {
      return Err(
        makeSwapErrorRight({
          message: '[thorchainInitialize]: initialize failed to set supportedAssetIds',
          code: SwapErrorType.INITIALIZE_FAILED,
          cause: (e as Error)?.message,
        }),
      )
    }
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { nonNftAssetIds, sellAssetId } = args
    if (!this.supportedSellAssetIds.includes(sellAssetId)) return []
    return nonNftAssetIds.filter(
      assetId => this.supportedBuyAssetIds.includes(assetId) && assetId !== sellAssetId,
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedSellAssetIds
  }

  buildTrade(input: BuildTradeInput): Promise<Result<ThorTrade<ThorChainId>, SwapErrorRight>> {
    const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
    const buyAssetUsdRate = selectBuyAssetUsdRate(swapperStore.getState())
    const feeAssetUsdRate = selectFeeAssetUsdRate(swapperStore.getState())
    return buildTrade(input, { sellAssetUsdRate, buyAssetUsdRate, feeAssetUsdRate })
  }

  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote<ThorChainId>, SwapErrorRight>> {
    const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
    const buyAssetUsdRate = selectBuyAssetUsdRate(swapperStore.getState())
    const feeAssetUsdRate = selectFeeAssetUsdRate(swapperStore.getState())
    return getThorTradeQuote(input, { sellAssetUsdRate, buyAssetUsdRate, feeAssetUsdRate })
  }

  async executeTrade(
    args: ExecuteTradeInput<ThorChainId>,
  ): Promise<Result<TradeResult, SwapErrorRight>> {
    try {
      const { trade, wallet } = args

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
        const evmAdapter = adapter as unknown as ThorEvmSupportedChainAdapter
        const { txData } = trade as ThorTrade<ThorEvmSupportedChainId>
        const txToSign = txData as SignTx<ThorEvmSupportedChainId>
        const tradeId = await signAndBroadcast({ adapter: evmAdapter, txToSign, wallet })
        return Ok({ tradeId })
      } else if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
        const signedTx = await (
          adapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>
        ).signTransaction({
          txToSign: (trade as ThorTrade<ThorUtxoSupportedChainId>)
            .txData as SignTx<ThorUtxoSupportedChainId>,
          wallet,
        })
        const txid = await adapter.broadcastTransaction(signedTx)
        return Ok({ tradeId: txid })
      } else if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
        const signedTx = await (
          adapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
        ).signTransaction({
          txToSign: (trade as ThorTrade<ThorCosmosSdkSupportedChainId>)
            .txData as SignTx<ThorCosmosSdkSupportedChainId>,
          wallet,
        })
        const txid = await adapter.broadcastTransaction(signedTx)
        return Ok({ tradeId: txid })
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
  }

  async getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    const midgardTxid = tradeResult.tradeId.startsWith('0x')
      ? tradeResult.tradeId.slice(2)
      : tradeResult.tradeId

    const midgardUrl = getConfig().REACT_APP_MIDGARD_URL

    return (
      await thorService.get<MidgardActionsResponse>(`${midgardUrl}/actions?txid=${midgardTxid}`)
    ).andThen<TradeTxs>(({ data }) => {
      // https://gitlab.com/thorchain/thornode/-/blob/develop/common/tx.go#L22
      // responseData?.actions[0].out[0].txID should be the txId for consistency, but the outbound Tx for Thor rune swaps is actually a BlankTxId
      // so we use the buyTxId for completion detection
      const buyTxid =
        data?.actions[0]?.status === 'success' && data?.actions[0]?.type === 'swap'
          ? midgardTxid
          : ''

      // This will detect all the errors I have seen.
      if (data?.actions[0]?.status === 'success' && data?.actions[0]?.type !== 'swap')
        return Err(
          makeSwapErrorRight({
            message: '[getTradeTxs]: trade failed',
            code: SwapErrorType.TRADE_FAILED,
            cause: data,
          }),
        )

      const standardBuyTxid = (() => {
        const outCoinAsset = data?.actions[0]?.out[0]?.coins[0]?.asset
        const isEvmCoinAsset = outCoinAsset?.startsWith('ETH.') || outCoinAsset?.startsWith('AVAX.')
        return isEvmCoinAsset ? `0x${buyTxid}` : buyTxid
      })().toLowerCase()

      return Ok({
        sellTxid: tradeResult.tradeId,
        buyTxid: standardBuyTxid,
      })
    })
  }
}
