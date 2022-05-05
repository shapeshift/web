import { CAIP19 } from '@shapeshiftoss/caip'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import {
  ApprovalNeededOutput,
  Asset,
  BuildQuoteTxInput,
  ChainTypes,
  ExecQuoteInput,
  ExecQuoteOutput,
  GetQuoteInput,
  MinMaxOutput,
  Quote,
  SwapperType
} from '@shapeshiftoss/types'
import Web3 from 'web3'

import {
  ApprovalNeededInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  Swapper,
  Trade,
  TradeQuote
} from '../../api'
import { getZrxMinMax } from './getZrxMinMax/getZrxMinMax'
import { getZrxQuote } from './getZrxQuote/getZrxQuote'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getUsdRate } from './utils/helpers/helpers'
import { ZrxApprovalNeeded } from './ZrxApprovalNeeded/ZrxApprovalNeeded'
import { ZrxApproveInfinite } from './ZrxApproveInfinite/ZrxApproveInfinite'
import { ZrxBuildQuoteTx } from './ZrxBuildQuoteTx/ZrxBuildQuoteTx'
import { zrxBuildTrade } from './zrxBuildTrade/zrxBuildTrade'
import { ZrxExecuteQuote } from './ZrxExecuteQuote/ZrxExecuteQuote'
import { zrxExecuteTrade } from './zrxExecuteTrade/zrxExecuteTrade'

export type ZrxSwapperDeps = {
  adapterManager: ChainAdapterManager
  web3: Web3
}

export class ZrxError extends Error {
  constructor(message: string) {
    super(message)
    this.message = `ZrxError:${message}`
  }
}

export class ZrxSwapper implements Swapper {
  public static swapperName = 'ZrxSwapper'
  deps: ZrxSwapperDeps

  constructor(deps: ZrxSwapperDeps) {
    this.deps = deps
  }

  getType() {
    return SwapperType.Zrx
  }

  async buildQuoteTx(args: BuildQuoteTxInput): Promise<Quote<ChainTypes>> {
    return ZrxBuildQuoteTx(this.deps, args)
  }

  async getQuote(input: GetQuoteInput): Promise<Quote<ChainTypes>> {
    return getZrxQuote(input)
  }

  async buildTrade(args: BuildTradeInput): Promise<Trade<ChainTypes>> {
    return zrxBuildTrade(this.deps, args)
  }

  async getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<ChainTypes>> {
    return getZrxTradeQuote(input)
  }

  async getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    return getUsdRate(input)
  }

  async getMinMax(input: GetQuoteInput): Promise<MinMaxOutput> {
    return getZrxMinMax(input)
  }

  async executeQuote(args: ExecQuoteInput<ChainTypes>): Promise<ExecQuoteOutput> {
    return ZrxExecuteQuote(this.deps, args)
  }

  async executeTrade(args: ExecuteTradeInput<ChainTypes>): Promise<ExecQuoteOutput> {
    return zrxExecuteTrade(this.deps, args)
  }

  async approvalNeeded(args: ApprovalNeededInput<ChainTypes>): Promise<ApprovalNeededOutput> {
    return ZrxApprovalNeeded(this.deps, args)
  }

  async approveInfinite(args: ApproveInfiniteInput<ChainTypes>): Promise<string> {
    return ZrxApproveInfinite(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): CAIP19[] {
    const { assetIds, sellAssetId } = args
    // TODO: pending changes to caip lib, we may want to import caip2 value instead.
    return assetIds.filter((id) => id.startsWith('eip155:1') && sellAssetId.startsWith('eip155:1'))
  }

  filterAssetIdsBySellable(assetIds: CAIP19[]): CAIP19[] {
    return assetIds.filter((id) => id.startsWith('eip155:1'))
  }
}
