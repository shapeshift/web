import { CAIP19 } from '@shapeshiftoss/caip'
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
  SwapperType
} from '@shapeshiftoss/types'
import Web3 from 'web3'

import { BuyAssetBySellIdInput, Swapper } from '../../api'
import { getZrxMinMax } from './getZrxMinMax/getZrxMinMax'
import { getZrxQuote } from './getZrxQuote/getZrxQuote'
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

  getDefaultPair(): [CAIP19, CAIP19] {
    const ETH = 'eip155:1/slip44:60'
    const FOX = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
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

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): CAIP19[] {
    const { assetIds, sellAssetId } = args
    // TODO: pending changes to caip lib, we may want to import caip2 value instead.
    return assetIds.filter((id) => id.startsWith('eip155:1') && sellAssetId.startsWith('eip155:1'))
  }

  filterAssetIdsBySellable(assetIds: CAIP19[]): CAIP19[] {
    return assetIds.filter((id) => id.startsWith('eip155:1'))
  }
}
