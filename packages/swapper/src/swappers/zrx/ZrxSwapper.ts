import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { avalanche, bnbsmartchain, ethereum, optimism } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from '../../api'
import { SwapError, SwapErrorType, SwapperName, SwapperType } from '../../api'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import type { ZrxExecuteTradeInput, ZrxSwapperDeps, ZrxTrade } from './types'
import { UNSUPPORTED_ASSETS } from './utils/blacklist'
import { getUsdRate } from './utils/helpers/helpers'
import { zrxApprovalNeeded } from './zrxApprovalNeeded/zrxApprovalNeeded'
import { zrxApproveAmount, zrxApproveInfinite } from './zrxApprove/zrxApprove'
import { zrxBuildTrade } from './zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from './zrxExecuteTrade/zrxExecuteTrade'

export type ZrxSupportedChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.OptimismMainnet
  | KnownChainIds.BnbSmartChainMainnet

export type ZrxSupportedChainAdapter =
  | ethereum.ChainAdapter
  | avalanche.ChainAdapter
  | optimism.ChainAdapter
  | bnbsmartchain.ChainAdapter

export class ZrxSwapper<T extends ZrxSupportedChainId> implements Swapper<T> {
  readonly name = SwapperName.Zrx
  deps: ZrxSwapperDeps
  chainId: ChainId

  constructor(deps: ZrxSwapperDeps) {
    this.deps = deps
    this.chainId = deps.adapter.getChainId()
  }

  getType() {
    switch (this.chainId) {
      case KnownChainIds.EthereumMainnet:
        return SwapperType.ZrxEthereum
      case KnownChainIds.AvalancheMainnet:
        return SwapperType.ZrxAvalanche
      case KnownChainIds.OptimismMainnet:
        return SwapperType.ZrxOptimism
      case KnownChainIds.BnbSmartChainMainnet:
        return SwapperType.ZrxBnbSmartChain
      default:
        throw new SwapError('[getType]', {
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        })
    }
  }

  async buildTrade(args: BuildTradeInput): Promise<ZrxTrade<T>> {
    return await zrxBuildTrade<T>(this.deps, args)
  }

  async getTradeQuote(input: GetEvmTradeQuoteInput): Promise<TradeQuote<T>> {
    return await getZrxTradeQuote<T>(input)
  }

  async getUsdRate(input: Asset): Promise<string> {
    return await getUsdRate(input)
  }

  async executeTrade(args: ZrxExecuteTradeInput<T>): Promise<TradeResult> {
    return await zrxExecuteTrade<T>(this.deps, args)
  }

  async approvalNeeded(args: ApprovalNeededInput<T>): Promise<ApprovalNeededOutput> {
    return await zrxApprovalNeeded<T>(this.deps, args)
  }

  async approveInfinite(args: ApproveInfiniteInput<T>): Promise<string> {
    return await zrxApproveInfinite<T>(this.deps, args)
  }

  async approveAmount(args: ApproveAmountInput<T>): Promise<string> {
    return await zrxApproveAmount<T>(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    return assetIds.filter(
      id =>
        fromAssetId(id).chainId === this.chainId &&
        fromAssetId(sellAssetId).chainId === this.chainId &&
        !UNSUPPORTED_ASSETS.includes(id),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[] = []): AssetId[] {
    return assetIds.filter(
      id => fromAssetId(id).chainId === this.chainId && !UNSUPPORTED_ASSETS.includes(id),
    )
  }

  async getTradeTxs(tradeResult: TradeResult): Promise<TradeTxs> {
    return await Promise.resolve({
      sellTxid: tradeResult.tradeId,
      buyTxid: tradeResult.tradeId,
    })
  }
}
