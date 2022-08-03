import { Asset } from '@shapeshiftoss/asset-service'
import { adapters, AssetId, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { bitcoin, cosmos, ethereum } from '@shapeshiftoss/chain-adapters'
import { BTCSignTx, CosmosSignTx, ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  SwapError,
  SwapErrorTypes,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs
} from '../../api'
import { buildTrade } from './buildThorTrade/buildThorTrade'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { thorTradeApprovalNeeded } from './thorTradeApprovalNeeded/thorTradeApprovalNeeded'
import { thorTradeApproveInfinite } from './thorTradeApproveInfinite/thorTradeApproveInfinite'
import { MidgardActionsResponse, PoolResponse, ThorchainSwapperDeps, ThorTrade } from './types'
import { getUsdRate } from './utils/getUsdRate/getUsdRate'
import { thorService } from './utils/thorService'

export class ThorchainSwapper implements Swapper<ChainId> {
  readonly name = 'Thorchain'
  private sellSupportedChainIds: Record<ChainId, boolean> = {
    [KnownChainIds.EthereumMainnet]: true,
    [KnownChainIds.BitcoinMainnet]: true,
    [KnownChainIds.CosmosMainnet]: true
  }

  private buySupportedChainIds: Record<ChainId, boolean> = {
    [KnownChainIds.EthereumMainnet]: true,
    [KnownChainIds.BitcoinMainnet]: true,
    [KnownChainIds.DogecoinMainnet]: true,
    [KnownChainIds.LitecoinMainnet]: true,
    [KnownChainIds.BitcoinCashMainnet]: true,
    [KnownChainIds.CosmosMainnet]: true
  }

  private supportedSellAssetIds: AssetId[] = []
  private supportedBuyAssetIds: AssetId[] = []
  deps: ThorchainSwapperDeps

  constructor(deps: ThorchainSwapperDeps) {
    this.deps = deps
  }

  async initialize() {
    try {
      const { data: responseData } = await thorService.get<PoolResponse[]>(
        `${this.deps.midgardUrl}/pools`
      )

      this.supportedSellAssetIds = responseData.reduce<AssetId[]>((acc, midgardPool) => {
        const assetId = adapters.poolAssetIdToAssetId(midgardPool.asset)
        if (!assetId || !this.sellSupportedChainIds[fromAssetId(assetId).chainId]) return acc
        acc.push(assetId)
        return acc
      }, [])

      this.supportedBuyAssetIds = responseData.reduce<AssetId[]>((acc, midgardPool) => {
        const assetId = adapters.poolAssetIdToAssetId(midgardPool.asset)
        if (!assetId || !this.buySupportedChainIds[fromAssetId(assetId).chainId]) return acc
        acc.push(assetId)
        return acc
      }, [])
    } catch (e) {
      throw new SwapError('[thorchainInitialize]: initialize failed to set supportedAssetIds', {
        code: SwapErrorTypes.INITIALIZE_FAILED,
        cause: e
      })
    }
  }

  getType() {
    return SwapperType.Thorchain
  }

  getUsdRate(input: Pick<Asset, 'symbol' | 'assetId'>): Promise<string> {
    return getUsdRate({ deps: this.deps, input })
  }

  async approvalNeeded(
    input: ApprovalNeededInput<KnownChainIds.EthereumMainnet>
  ): Promise<ApprovalNeededOutput> {
    return thorTradeApprovalNeeded({ deps: this.deps, input })
  }

  async approveInfinite(
    input: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>
  ): Promise<string> {
    return thorTradeApproveInfinite({ deps: this.deps, input })
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    if (!this.supportedSellAssetIds.includes(sellAssetId)) return []
    return assetIds.filter(
      (assetId) => this.supportedBuyAssetIds.includes(assetId) && assetId !== sellAssetId
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedSellAssetIds
  }

  async buildTrade(input: BuildTradeInput): Promise<Trade<ChainId>> {
    return buildTrade({ deps: this.deps, input })
  }

  async getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<ChainId>> {
    return getThorTradeQuote({ deps: this.deps, input })
  }

  async executeTrade(args: ExecuteTradeInput<ChainId>): Promise<TradeResult> {
    try {
      const { trade, wallet } = args
      const adapter = this.deps.adapterManager.get(trade.sellAsset.chainId)

      if (!adapter)
        throw new SwapError('[executeTrade]: no adapter for sell asset chain id', {
          code: SwapErrorTypes.SIGN_AND_BROADCAST_FAILED,
          details: { chainId: trade.sellAsset.chainId },
          fn: 'executeTrade'
        })

      if (trade.sellAsset.chainId === KnownChainIds.EthereumMainnet) {
        const signedTx = await (adapter as unknown as ethereum.ChainAdapter).signTransaction({
          txToSign: (trade as ThorTrade<KnownChainIds.EthereumMainnet>).txData as ETHSignTx,
          wallet
        })
        const txid = await adapter.broadcastTransaction(signedTx)
        return { tradeId: txid }
      } else if (trade.sellAsset.chainId === KnownChainIds.BitcoinMainnet) {
        const signedTx = await (adapter as unknown as bitcoin.ChainAdapter).signTransaction({
          txToSign: (trade as ThorTrade<KnownChainIds.BitcoinMainnet>).txData as BTCSignTx,
          wallet
        })
        const txid = await adapter.broadcastTransaction(signedTx)
        return { tradeId: txid }
      } else if (trade.sellAsset.chainId === KnownChainIds.CosmosMainnet) {
        const signedTx = await (adapter as unknown as cosmos.ChainAdapter).signTransaction({
          txToSign: (trade as ThorTrade<KnownChainIds.CosmosMainnet>).txData as CosmosSignTx,
          wallet
        })
        const txid = await adapter.broadcastTransaction(signedTx)
        return { tradeId: txid }
      } else {
        throw new SwapError('[executeTrade]: unsupported trade', {
          code: SwapErrorTypes.SIGN_AND_BROADCAST_FAILED,
          fn: 'executeTrade'
        })
      }
    } catch (e) {
      if (e instanceof SwapError) throw e
      throw new SwapError('[executeTrade]: failed to sign or broadcast', {
        code: SwapErrorTypes.SIGN_AND_BROADCAST_FAILED,
        cause: e
      })
    }
  }

  async getTradeTxs(tradeResult: TradeResult): Promise<TradeTxs> {
    try {
      const midgardTxid = tradeResult.tradeId.startsWith('0x')
        ? tradeResult.tradeId.slice(2)
        : tradeResult.tradeId

      const { data: responseData } = await thorService.get<MidgardActionsResponse>(
        `${this.deps.midgardUrl}/actions?txid=${midgardTxid}`
      )

      const buyTxid =
        responseData?.actions[0]?.status === 'success' && responseData?.actions[0]?.type === 'swap'
          ? responseData?.actions[0].out[0].txID
          : ''

      // This will detect all the errors I have seen.
      if (
        responseData?.actions[0]?.status === 'success' &&
        responseData?.actions[0]?.type !== 'swap'
      )
        throw new SwapError('[getTradeTxs]: trade failed', {
          code: SwapErrorTypes.TRADE_FAILED,
          cause: responseData
        })

      return {
        sellTxid: tradeResult.tradeId,
        buyTxid: buyTxid.toLowerCase()
      }
    } catch (e) {
      if (e instanceof SwapError) throw e
      throw new SwapError('[getTradeTxs]: error', {
        code: SwapErrorTypes.GET_TRADE_TXS_FAILED,
        cause: e
      })
    }
  }
}
