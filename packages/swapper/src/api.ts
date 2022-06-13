import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { createErrorClass } from '@shapeshiftoss/errors'
import { BTCSignTx, ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset, ChainSpecific, KnownChainIds } from '@shapeshiftoss/types'

export const SwapError = createErrorClass('SwapError')

type ChainSpecificQuoteFeeData<T extends ChainId> = ChainSpecific<
  T,
  {
    'eip155:1': {
      estimatedGas?: string
      gasPrice?: string
      approvalFee?: string
      totalFee?: string
    }
    'bip122:000000000019d6689c085ae165831e93': {
      byteCount: string
      satsPerByte: string
    }
  }
>

export type QuoteFeeData<T extends ChainId> = {
  fee: string
  tradeFee: string // fee taken out of the trade from the buyAsset
} & ChainSpecificQuoteFeeData<T>

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
  sellAssetAccountNumber: number
  wallet?: HDWallet
}
export type GetTradeQuoteInput = CommonTradeInput

export type BuildTradeInput = CommonTradeInput & {
  buyAssetAccountNumber: number
  slippage?: string
  wallet: HDWallet
}

interface TradeBase<C extends ChainId> {
  buyAmount: string
  sellAmount: string
  feeData: QuoteFeeData<C>
  rate: string
  sources: Array<SwapSource>
  buyAsset: Asset
  sellAsset: Asset
  sellAssetAccountNumber: number
}

export interface TradeQuote<C extends ChainId> extends TradeBase<C> {
  allowanceContract: string
  minimum: string
  maximum: string
}

export interface Trade<C extends ChainId> extends TradeBase<C> {
  receiveAddress: string
}

export interface ZrxTrade extends Trade<'eip155:1'> {
  txData: string
  depositAddress: string
}

export interface BtcThorTrade<C extends ChainId> extends Trade<C> {
  chainId: KnownChainIds.BitcoinMainnet
  txData: BTCSignTx
}

export interface EthThorTrade<C extends ChainId> extends Trade<C> {
  chainId: KnownChainIds.EthereumMainnet
  txData: ETHSignTx
}

export type ThorTrade<C extends ChainId> = BtcThorTrade<C> | EthThorTrade<C>

export type ExecuteTradeInput<C extends ChainId> = {
  trade: Trade<C>
  wallet: HDWallet
}

export type TradeResult = {
  tradeId: string
}

export type ApproveInfiniteInput<C extends ChainId> = {
  quote: TradeQuote<C>
  wallet: HDWallet
}

export type ApprovalNeededInput<C extends ChainId> = {
  quote: TradeQuote<C>
  wallet: HDWallet
}

export type SwapSource = {
  name: string
  proportion: string
}

export interface MinMaxOutput {
  minimum: string
  maximum: string
}

export type GetMinMaxInput = {
  sellAsset: Asset
  buyAsset: Asset
}

export type ApprovalNeededOutput = {
  approvalNeeded: boolean
}

export enum SwapperType {
  Zrx = '0x',
  Thorchain = 'Thorchain',
  CowSwap = 'CowSwap',
  Test = 'Test'
}

export type TradeTxs = {
  sellTxid: string
  buyTxid?: string
}

// Swap Errors
export enum SwapErrorTypes {
  ALLOWANCE_REQUIRED_FAILED = 'ALLOWANCE_REQUIRED_FAILED',
  APPROVE_INFINITE_FAILED = 'APPROVE_INFINITE_FAILED',
  BUILD_TRADE_FAILED = 'BUILD_TRADE_FAILED',
  CHECK_APPROVAL_FAILED = 'CHECK_APPROVAL_FAILED',
  EXECUTE_TRADE_FAILED = 'EXECUTE_TRADE_FAILED',
  GRANT_ALLOWANCE_FAILED = 'GRANT_ALLOWANCE_FAILED',
  INITIALIZE_FAILED = 'INITIALIZE_FAILED',
  MANAGER_ERROR = 'MANAGER_ERROR',
  MIN_MAX_FAILED = 'MIN_MAX_FAILED',
  RESPONSE_ERROR = 'RESPONSE_ERROR',
  SIGN_AND_BROADCAST_FAILED = 'SIGN_AND_BROADCAST_FAILED',
  TRADE_QUOTE_FAILED = 'TRADE_QUOTE_FAILED',
  UNSUPPORTED_PAIR = 'UNSUPPORTED_PAIR',
  USD_RATE_FAILED = 'USD_RATE_FAILED',
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  UNSUPPORTED_NAMESPACE = 'UNSUPPORTED_NAMESPACE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MAKE_MEMO_FAILED = 'MAKE_MEMO_FAILED',
  PRICE_RATIO_FAILED = 'PRICE_RATIO_FAILED',
  POOL_NOT_FOUND = 'POOL_NOT_FOUND'
}

export interface Swapper<T extends ChainId, TxType = unknown> {
  /** perform any necessary async initialization */
  initialize(): Promise<void>

  /** Returns the swapper type */
  getType(): SwapperType

  /**
   * Get builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  buildTrade(args: BuildTradeInput): Promise<Trade<T>>

  /**
   * Get a trade quote
   */
  getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<T>>

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  getUsdRate(input: Asset): Promise<string>

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  executeTrade(args: ExecuteTradeInput<T>): Promise<TradeResult>

  /**
   * Get a boolean if a quote needs approval
   */
  approvalNeeded(args: ApprovalNeededInput<T>): Promise<ApprovalNeededOutput>

  /**
   * Get the txid of an approve infinite transaction
   */
  approveInfinite(args: ApproveInfiniteInput<T>): Promise<string>

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[]

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[]

  getTradeTxs(tradeResult: TradeResult): Promise<TxType>
}
