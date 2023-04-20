import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { avalanche, bnbsmartchain, ethereum, optimism } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapError, SwapErrorType, SwapperName, SwapperType } from 'lib/swapper/api'
import { getZrxTradeQuote } from 'lib/swapper/swappers/ZrxSwapper/getZrxTradeQuote/getZrxTradeQuote'
import type {
  ZrxExecuteTradeInput,
  ZrxSwapperDeps,
  ZrxTrade,
} from 'lib/swapper/swappers/ZrxSwapper/types'
import { UNSUPPORTED_ASSETS } from 'lib/swapper/swappers/ZrxSwapper/utils/blacklist'
import { getUsdRate } from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxApprovalNeeded } from 'lib/swapper/swappers/ZrxSwapper/zrxApprovalNeeded/zrxApprovalNeeded'
import {
  zrxApproveAmount,
  zrxApproveInfinite,
} from 'lib/swapper/swappers/ZrxSwapper/zrxApprove/zrxApprove'
import { zrxBuildTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from 'lib/swapper/swappers/ZrxSwapper/zrxExecuteTrade/zrxExecuteTrade'

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

  buildTrade(args: BuildTradeInput): Promise<Result<ZrxTrade<T>, SwapErrorRight>> {
    return zrxBuildTrade<T>(this.deps, args)
  }

  getTradeQuote(input: GetEvmTradeQuoteInput): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
    return getZrxTradeQuote<T>(input)
  }

  getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(input)
  }

  executeTrade(args: ZrxExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>> {
    return zrxExecuteTrade<T>(this.deps, args)
  }

  approvalNeeded(args: ApprovalNeededInput<T>): Promise<ApprovalNeededOutput> {
    return zrxApprovalNeeded<T>(this.deps, args)
  }

  approveInfinite(args: ApproveInfiniteInput<T>): Promise<string> {
    return zrxApproveInfinite<T>(this.deps, args)
  }

  approveAmount(args: ApproveAmountInput<T>): Promise<string> {
    return zrxApproveAmount<T>(this.deps, args)
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

  getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return Promise.resolve(
      Ok({
        sellTxid: tradeResult.tradeId,
        buyTxid: tradeResult.tradeId,
      }),
    )
  }
}
