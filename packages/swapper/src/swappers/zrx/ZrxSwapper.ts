import Web3 from 'web3'
import {
  Asset,
  ApprovalNeededInput,
  ApprovalNeededOutput,
  BuildQuoteTxInput,
  ChainTypes,
  GetQuoteInput,
  Quote,
  SwapperType,
  MinMaxOutput,
  ExecQuoteInput,
  ExecQuoteOutput
} from '@shapeshiftoss/types'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { Swapper } from '../../api'
import { buildQuoteTx } from './buildQuoteTx/buildQuoteTx'
import { getZrxQuote } from './getQuote/getQuote'
import { getUsdRate } from './utils/helpers/helpers'
import { getMinMax } from './getMinMax/getMinMax'
import { executeQuote } from './executeQuote/executeQuote'
import { approvalNeeded } from './approvalNeeded/approvalNeeded'

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
}
