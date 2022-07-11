import { AssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import { Asset, KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetTradeQuoteInput,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs
} from '../../api'
import { cowApprovalNeeded } from './cowApprovalNeeded/cowApprovalNeeded'
import { cowApproveInfinite } from './cowApproveInfinite/cowApproveInfinite'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote/getCowSwapTradeQuote'
import { COWSWAP_UNSUPPORTED_ASSETS } from './utils/blacklist'
import { getUsdRate } from './utils/helpers/helpers'

/**
 * CowSwap only supports ERC-20 swaps, hence ETH is not supported
 * In order to get rates correctly, we need WETH asset to be passed as feeAsset
 */
export type CowSwapperDeps = {
  apiUrl: string
  adapter: ethereum.ChainAdapter
  web3: Web3
  feeAsset: Asset // should be WETH asset
}

export class CowSwapper implements Swapper<KnownChainIds.EthereumMainnet> {
  readonly name = 'CowSwap'
  deps: CowSwapperDeps

  constructor(deps: CowSwapperDeps) {
    this.deps = deps
  }

  getType() {
    return SwapperType.CowSwap
  }

  async buildTrade(args: BuildTradeInput): Promise<Trade<KnownChainIds.EthereumMainnet>> {
    console.info(args)
    throw new Error('CowSwapper: buildTrade unimplemented')
  }

  async getTradeQuote(
    input: GetTradeQuoteInput
  ): Promise<TradeQuote<KnownChainIds.EthereumMainnet>> {
    return getCowSwapTradeQuote(this.deps, input)
  }

  async getUsdRate(input: Asset): Promise<string> {
    return getUsdRate(this.deps, input)
  }

  async executeTrade(args: ExecuteTradeInput<KnownChainIds.EthereumMainnet>): Promise<TradeResult> {
    console.info(args)
    throw new Error('CowSwapper: executeTrade unimplemented')
  }

  async approvalNeeded(
    args: ApprovalNeededInput<KnownChainIds.EthereumMainnet>
  ): Promise<ApprovalNeededOutput> {
    return cowApprovalNeeded(this.deps, args)
  }

  async approveInfinite(
    args: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>
  ): Promise<string> {
    return cowApproveInfinite(this.deps, args)
  }

  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[] {
    const { assetIds = [], sellAssetId } = args
    if (
      !sellAssetId?.startsWith('eip155:1/erc20') ||
      COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)
    )
      return []

    return assetIds.filter(
      (id) =>
        id !== sellAssetId &&
        id.startsWith('eip155:1/erc20') &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(id)
    )
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return assetIds.filter(
      (id) => id.startsWith('eip155:1/erc20') && !COWSWAP_UNSUPPORTED_ASSETS.includes(id)
    )
  }

  async getTradeTxs(): Promise<TradeTxs> {
    throw new Error('CowSwapper: executeTrade unimplemented')
  }
}
