import { AssetId } from '@shapeshiftoss/caip'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  ApprovalNeededOutput,
  Asset,
  ChainSpecific,
  ExecQuoteOutput,
  GetMinMaxInput,
  MinMaxOutput,
  SupportedChainIds,
  SwapperType
} from '@shapeshiftoss/types'

export type SupportedAssetInput = {
  assetIds: AssetId[]
}

type ChainSpecificQuoteFeeData<T1> = ChainSpecific<
  T1,
  {
    'eip155:1': {
      estimatedGas?: string
      gasPrice?: string
      approvalFee?: string
      totalFee?: string
    }
  }
>

export type QuoteFeeData<T1 extends SupportedChainIds> = {
  fee: string
} & ChainSpecificQuoteFeeData<T1>

export type ByPairInput = {
  sellAssetId: AssetId
  buyAssetId: AssetId
}

export type BuyAssetBySellIdInput = {
  sellAssetId: AssetId
  assetIds: AssetId[]
}

export type SupportedSellAssetsInput = {
  assetIds: AssetId[]
}

export type CommonTradeInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  sendMax: boolean
  sellAssetAccountId: string
}
export type GetTradeQuoteInput = CommonTradeInput

export type BuildTradeInput = CommonTradeInput & {
  buyAssetAccountId: string
  slippage?: string
  wallet: HDWallet
}

interface TradeBase<C extends SupportedChainIds> {
  success: boolean // This will go away when we correctly handle errors
  statusReason: string // This will go away when we correctly handle errors
  buyAmount: string
  sellAmount: string
  feeData: QuoteFeeData<C>
  rate: string
  allowanceContract: string
  sources: Array<SwapSource>
  buyAsset: Asset
  sellAsset: Asset
  sellAssetAccountId: string
}

export interface TradeQuote<C extends SupportedChainIds> extends TradeBase<C> {
  minimum: string
  maximum: string
}

export interface Trade<C extends SupportedChainIds> extends TradeBase<C> {
  txData: string
  depositAddress: string
  receiveAddress: string
}

export type ExecuteTradeInput<C extends SupportedChainIds> = {
  trade: Trade<C>
  wallet: HDWallet
}

export type TradeResult = {
  txid: string
}

export type SwapSource = {
  name: string
  proportion: string
}

export type ApproveInfiniteInput<C extends SupportedChainIds> = {
  quote: TradeQuote<C>
  wallet: HDWallet
}

export type ApprovalNeededInput<C extends SupportedChainIds> = {
  quote: TradeQuote<C>
  wallet: HDWallet
}

export class SwapError extends Error {}

export interface Swapper {
  /** Returns the swapper type */
  getType(): SwapperType

  /**
   * Get builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  buildTrade(args: BuildTradeInput): Promise<Trade<SupportedChainIds>>

  /**
   * Get a trade quote
   */
  getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<SupportedChainIds>>

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string>

  /**
   * Get the minimum and maximum trade value of the sellAsset and buyAsset
   */
  getMinMax(input: GetMinMaxInput): Promise<MinMaxOutput>

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  executeTrade(args: ExecuteTradeInput<SupportedChainIds>): Promise<ExecQuoteOutput>

  /**
   * Get a boolean if a quote needs approval
   */
  approvalNeeded(args: ApprovalNeededInput<SupportedChainIds>): Promise<ApprovalNeededOutput>

  /**
   * Get the txid of an approve infinite transaction
   */
  approveInfinite(args: ApproveInfiniteInput<SupportedChainIds>): Promise<string>

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[]

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[]
}
