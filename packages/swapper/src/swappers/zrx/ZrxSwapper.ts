import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  EvmSupportedChainIds,
  GetEvmTradeQuoteInput,
  SwapError,
  SwapErrorTypes,
  Swapper,
  SwapperName,
  SwapperType,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from '../../api'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { ZrxExecuteTradeInput, ZrxSwapperDeps, ZrxTrade } from './types'
import { UNSUPPORTED_ASSETS } from './utils/blacklist'
import { getUsdRate } from './utils/helpers/helpers'
import { zrxApprovalNeeded } from './zrxApprovalNeeded/zrxApprovalNeeded'
import { zrxApproveAmount, zrxApproveInfinite } from './zrxApprove/zrxApprove'
import { zrxBuildTrade } from './zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from './zrxExecuteTrade/zrxExecuteTrade'

export class ZrxSwapper<T extends EvmSupportedChainIds> implements Swapper<T> {
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
      default:
        throw new SwapError('[getType]', {
          code: SwapErrorTypes.UNSUPPORTED_CHAIN,
        })
    }
  }

  async buildTrade(args: BuildTradeInput): Promise<ZrxTrade<T>> {
    return zrxBuildTrade<T>(this.deps, args)
  }

  async getTradeQuote(input: GetEvmTradeQuoteInput): Promise<TradeQuote<T>> {
    return getZrxTradeQuote<T>(input)
  }

  async getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(input)
  }

  async executeTrade(args: ZrxExecuteTradeInput<T>): Promise<TradeResult> {
    return zrxExecuteTrade<T>(this.deps, args)
  }

  async approvalNeeded(args: ApprovalNeededInput<T>): Promise<ApprovalNeededOutput> {
    return zrxApprovalNeeded<T>(this.deps, args)
  }

  async approveInfinite(args: ApproveInfiniteInput<T>): Promise<string> {
    return zrxApproveInfinite<T>(this.deps, args)
  }

  async approveAmount(args: ApproveAmountInput<T>): Promise<string> {
    return zrxApproveAmount<T>(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    return assetIds.filter(
      (id) =>
        id.startsWith(this.chainId) &&
        sellAssetId?.startsWith(this.chainId) &&
        !UNSUPPORTED_ASSETS.includes(id),
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[] = []): AssetId[] {
    return assetIds.filter((id) => id.startsWith(this.chainId) && !UNSUPPORTED_ASSETS.includes(id))
  }

  async getTradeTxs(tradeResult: TradeResult): Promise<TradeTxs> {
    return {
      sellTxid: tradeResult.tradeId,
      buyTxid: tradeResult.tradeId,
    }
  }
}
