import { CAIP19 } from '@shapeshiftoss/caip'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  ApprovalNeededOutput,
  Asset,
  BuildQuoteTxInput,
  chainAdapters,
  ChainTypes,
  ExecQuoteInput,
  ExecQuoteOutput,
  GetQuoteInput,
  MinMaxOutput,
  Quote,
  SwapperType
} from '@shapeshiftoss/types'
export type SupportedAssetInput = {
  assetIds: CAIP19[]
}

export type ByPairInput = {
  sellAssetId: CAIP19
  buyAssetId: CAIP19
}

export type BuyAssetBySellIdInput = {
  sellAssetId: CAIP19
  assetIds: CAIP19[]
}

export type SupportedSellAssetsInput = {
  assetIds: CAIP19[]
}

export type CommonTradeInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmount?: string
  buyAmount?: string
  sendMax: boolean
  sellAssetAccountId: string
}
export type GetTradeQuoteInput = CommonTradeInput

export type BuildTradeInput = CommonTradeInput & {
  buyAssetAccountId: string
  slippage?: string
  wallet: HDWallet
}

interface TradeBase<C extends ChainTypes> {
  success: boolean // This will go away when we correctly handle errors
  statusReason: string // This will go away when we correctly handle errors
  buyAmount: string
  sellAmount: string
  feeData: chainAdapters.QuoteFeeData<C>
  rate: string
  allowanceContract: string
  sources: Array<SwapSource>
  buyAsset: Asset
  sellAsset: Asset
  sellAssetAccountId: string
}

export interface TradeQuote<C extends ChainTypes> extends TradeBase<C> {
  minimum: string
  maximum: string
}

export interface Trade<C extends ChainTypes> extends TradeBase<C> {
  txData: string
  depositAddress: string
  receiveAddress: string
}

export type ExecuteTradeInput<C extends ChainTypes> = {
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

export type ApproveInfiniteInput<C extends ChainTypes> = {
  quote: Quote<C> | TradeQuote<C>
  wallet: HDWallet
}

export type ApprovalNeededInput<C extends ChainTypes> = {
  quote: Quote<C> | TradeQuote<C>
  wallet: HDWallet
}

export class SwapError extends Error {}

export interface Swapper {
  /** Returns the swapper type */
  getType(): SwapperType

  /**
   * Get builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  buildTrade(args: BuildTradeInput): Promise<Trade<ChainTypes>>

  /**
   * Get a trade quote
   */
  getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<ChainTypes>>

  /**
   * Get a Quote along with an unsigned transaction that can be signed and broadcast to execute the swap
   * @deprecated The method is going away soon.
   **/
  buildQuoteTx(args: BuildQuoteTxInput): Promise<Quote<ChainTypes>>

  /**
   * Get a basic quote (rate) for a trading pair
   * @deprecated The method is going away soon.
   */
  getQuote(input: GetQuoteInput, wallet?: HDWallet): Promise<Quote<ChainTypes>>

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  getUsdRate(input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string>

  /**
   * Get the minimum and maximum trade value of the sellAsset and buyAsset
   */
  getMinMax(input: GetQuoteInput): Promise<MinMaxOutput>

  /**
   * Execute a quote built with buildQuoteTx by signing and broadcasting
   */
  executeQuote(args: ExecQuoteInput<ChainTypes>): Promise<ExecQuoteOutput>

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  executeTrade(args: ExecuteTradeInput<ChainTypes>): Promise<ExecQuoteOutput>

  /**
   * Get a boolean if a quote needs approval
   */
  approvalNeeded(args: ApprovalNeededInput<ChainTypes>): Promise<ApprovalNeededOutput>

  /**
   * Get the txid of an approve infinite transaction
   */
  approveInfinite(args: ApproveInfiniteInput<ChainTypes>): Promise<string>

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): CAIP19[]

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(assetIds: CAIP19[]): CAIP19[]
}
