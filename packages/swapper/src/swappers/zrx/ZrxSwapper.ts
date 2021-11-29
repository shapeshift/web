import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveInfiniteInput,
  Asset,
  BuildQuoteTxInput,
  ChainTypes,
  ExecQuoteInput,
  ExecQuoteOutput,
  GetQuoteInput,
  MinMaxOutput,
  Quote,
  SendMaxAmountInput,
  SwapperType
} from '@shapeshiftoss/types'
import Web3 from 'web3'

import { Swapper } from '../../api'
import { getZrxMinMax } from './getZrxMinMax/getZrxMinMax'
import { getZrxQuote } from './getZrxQuote/getZrxQuote'
import { getZrxSendMaxAmount } from './getZrxSendMaxAmount/getZrxSendMaxAmount'
import { getUsdRate } from './utils/helpers/helpers'
import { ZrxApprovalNeeded } from './ZrxApprovalNeeded/ZrxApprovalNeeded'
import { ZrxApproveInfinite } from './ZrxApproveInfinite/ZrxApproveInfinite'
import { ZrxBuildQuoteTx } from './ZrxBuildQuoteTx/ZrxBuildQuoteTx'
import { ZrxExecuteQuote } from './ZrxExecuteQuote/ZrxExecuteQuote'
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

  async buildQuoteTx(args: BuildQuoteTxInput): Promise<Quote<ChainTypes, SwapperType>> {
    return ZrxBuildQuoteTx(this.deps, args)
  }

  async getQuote(input: GetQuoteInput): Promise<Quote<ChainTypes, SwapperType>> {
    return getZrxQuote(input)
  }

  async getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    return getUsdRate(input)
  }

  async getMinMax(input: GetQuoteInput): Promise<MinMaxOutput> {
    return getZrxMinMax(input)
  }

  getAvailableAssets(assets: Asset[]): Asset[] {
    return assets.filter((asset) => asset.chain === ChainTypes.Ethereum)
  }

  canTradePair(sellAsset: Asset, buyAsset: Asset): boolean {
    const availableAssets = this.getAvailableAssets([sellAsset, buyAsset])
    return availableAssets.length === 2
  }

  getDefaultPair(): Pick<Asset, 'chain' | 'symbol' | 'name'>[] {
    const ETH = { name: 'Ethereum', chain: ChainTypes.Ethereum, symbol: 'ETH' }
    const FOX = { name: 'Fox', chain: ChainTypes.Ethereum, symbol: 'FOX' }
    return [ETH, FOX]
  }

  async executeQuote(args: ExecQuoteInput<ChainTypes, SwapperType>): Promise<ExecQuoteOutput> {
    return ZrxExecuteQuote(this.deps, args)
  }

  async approvalNeeded(
    args: ApprovalNeededInput<ChainTypes, SwapperType>
  ): Promise<ApprovalNeededOutput> {
    return ZrxApprovalNeeded(this.deps, args)
  }

  async approveInfinite(args: ApproveInfiniteInput<ChainTypes, SwapperType>): Promise<string> {
    return ZrxApproveInfinite(this.deps, args)
  }

  async getSendMaxAmount(args: SendMaxAmountInput): Promise<string> {
    return getZrxSendMaxAmount(this.deps, args)
  }
}
