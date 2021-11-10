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
import { approvalNeeded } from './approvalNeeded/approvalNeeded'
import { approveInfinite } from './approveInfinite/approveInfinite'
import { buildQuoteTx } from './buildQuoteTx/buildQuoteTx'
import { executeQuote } from './executeQuote/executeQuote'
import { getMinMax } from './getMinMax/getMinMax'
import { getZrxQuote } from './getQuote/getQuote'
import { getSendMaxAmount } from './getSendMaxAmount/getSendMaxAmount'
import { getUsdRate } from './utils/helpers/helpers'
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
    return buildQuoteTx(this.deps, args)
  }

  async getQuote(input: GetQuoteInput): Promise<Quote<ChainTypes, SwapperType>> {
    return getZrxQuote(input)
  }

  async getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    return getUsdRate(input)
  }

  async getMinMax(input: GetQuoteInput): Promise<MinMaxOutput> {
    return getMinMax(input)
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
    const USDC = { name: 'USD Coin', chain: ChainTypes.Ethereum, symbol: 'USDC' }
    return [ETH, USDC]
  }

  async executeQuote(args: ExecQuoteInput<ChainTypes, SwapperType>): Promise<ExecQuoteOutput> {
    return executeQuote(this.deps, args)
  }

  async approvalNeeded(
    args: ApprovalNeededInput<ChainTypes, SwapperType>
  ): Promise<ApprovalNeededOutput> {
    return approvalNeeded(this.deps, args)
  }

  async approveInfinite(args: ApproveInfiniteInput<ChainTypes, SwapperType>): Promise<string> {
    return approveInfinite(this.deps, args)
  }

  async getSendMaxAmount(args: SendMaxAmountInput): Promise<string> {
    return getSendMaxAmount(this.deps, args)
  }
}
