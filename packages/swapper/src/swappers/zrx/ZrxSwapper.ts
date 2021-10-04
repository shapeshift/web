import Web3 from 'web3'
import { AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import { zrxService } from './utils/zrxService'
import {
  Asset,
  BuildQuoteTxInput,
  ChainTypes,
  GetQuoteInput,
  Quote,
  SwapperType,
  QuoteResponse,
  ExecQuoteInput,
  ExecQuoteOutput
} from '@shapeshiftoss/types'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { Swapper } from '../../api'

import { buildQuoteTx } from './buildQuoteTx/buildQuoteTx'
import { getZrxQuote } from './getQuote/getQuote'
import { executeQuote } from './executeQuote/executeQuote'

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

  async buildQuoteTx(args: BuildQuoteTxInput): Promise<Quote> {
    return buildQuoteTx(this.deps, args)
  }

  async getQuote(input: GetQuoteInput): Promise<Quote> {
    return getZrxQuote(input)
  }

  async getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> {
    const { symbol, tokenId } = input
    const rateResponse: AxiosResponse<QuoteResponse> = await zrxService.get<QuoteResponse>(
      '/swap/v1/price',
      {
        params: {
          buyToken: 'USDC',
          buyAmount: '1000000', // $1
          sellToken: tokenId || symbol
        }
      }
    )
    if (!rateResponse.data.price) throw new ZrxError('getUsdRate - Failed to get price data')

    return new BigNumber(1).dividedBy(rateResponse.data.price).toString()
  }

  getAvailableAssets(assets: Asset[]): Asset[] {
    return assets.filter((asset) => asset.chain === ChainTypes.Ethereum)
  }

  canTradePair(sellAsset: Asset, buyAsset: Asset): boolean {
    const availableAssets = this.getAvailableAssets([sellAsset, buyAsset])
    return availableAssets.length === 2
  }

  async executeQuote(args: ExecQuoteInput): Promise<ExecQuoteOutput> {
    return executeQuote(this.deps, args)
  }
}
