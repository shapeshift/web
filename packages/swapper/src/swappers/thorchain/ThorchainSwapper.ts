import { adapters, AssetId, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveInfiniteInput,
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
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { thorTradeApprovalNeeded } from './thorTradeApprovalNeeded/thorTradeApprovalNeeded'
import { thorTradeApproveInfinite } from './thorTradeApproveInfinite/thorTradeApproveInfinite'
import { PoolResponse, ThorchainSwapperDeps, ThorTrade } from './types'
import { getUsdRate } from './utils/getUsdRate/getUsdRate'
import { thorService } from './utils/thorService'

export class ThorchainSwapper implements Swapper<ChainId> {
  readonly name = 'Thorchain'
  private swapSupportedChainIds: Record<ChainId, boolean> = {
    'eip155:1': true,
    'bip122:000000000019d6689c085ae165831e93': true
  }
  private supportedAssetIds: AssetId[] = []
  deps: ThorchainSwapperDeps

  constructor(deps: ThorchainSwapperDeps) {
    this.deps = deps
  }

  async initialize() {
    try {
      const { data: responseData } = await thorService.get<PoolResponse[]>(
        `${this.deps.midgardUrl}/pools`
      )

      const supportedAssetIds = responseData.reduce<AssetId[]>((acc, midgardPool) => {
        const assetId = adapters.poolAssetIdToAssetId(midgardPool.asset)
        if (!assetId || !this.swapSupportedChainIds[fromAssetId(assetId).chainId]) return acc
        acc.push(assetId)
        return acc
      }, [])

      this.supportedAssetIds = supportedAssetIds
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
    if (!this.supportedAssetIds.includes(sellAssetId)) return []
    return assetIds.filter(
      (assetId) => this.supportedAssetIds.includes(assetId) && assetId !== sellAssetId
    )
  }

  filterAssetIdsBySellable(): AssetId[] {
    return this.supportedAssetIds
  }

  async buildTrade(): Promise<Trade<ChainId>> {
    throw new Error('ThorchainSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<ChainId>> {
    return getThorTradeQuote({ deps: this.deps, input })
  }

  async executeTrade(args: ExecuteTradeInput<ChainId>): Promise<TradeResult> {
    const { trade, wallet } = args
    const adapter = this.deps.adapterManager.get(trade.sellAsset.chainId) as
      | ethereum.ChainAdapter
      | undefined

    if (adapter && trade.sellAsset.chainId === KnownChainIds.EthereumMainnet) {
      const thorTradeEth = trade as ThorTrade<'eip155:1'>
      const signedTx = await adapter.signTransaction({
        txToSign: thorTradeEth.txData as ETHSignTx,
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
  }

  async getTradeTxs(): Promise<TradeTxs> {
    throw new Error('ThorchainSwapper: executeTrade unimplemented')
  }
}
