import type { AccountId, AssetId, ChainId, Nominal } from '@shapeshiftoss/caip'
import type {
  ChainSignTx,
  CosmosSdkChainId,
  EvmChainId,
  SignTx,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import { createErrorClass } from '@shapeshiftoss/errors'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { ChainSpecific, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { ReduxState } from 'state/reducer'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export const SwapError = createErrorClass('SwapError')

export type SwapErrorRight = {
  name: 'SwapError'
  message: string
  cause?: unknown
  details?: unknown
  code?: string
}

export const makeSwapErrorRight = ({
  details,
  cause,
  code,
  message,
}: {
  message: string
  details?: unknown
  cause?: unknown
  code?: string
}): SwapErrorRight => ({
  name: 'SwapError',
  message,
  details,
  cause,
  code,
})

export type UtxoFeeData = {
  byteCount: string
  satsPerByte: string
}

export type CosmosSdkFeeData = {
  estimatedGasCryptoBaseUnit: string
}

type ChainSpecificQuoteFeeData<T extends ChainId> = ChainSpecific<
  T,
  {
    [KnownChainIds.BitcoinMainnet]: UtxoFeeData
    [KnownChainIds.DogecoinMainnet]: UtxoFeeData
    [KnownChainIds.LitecoinMainnet]: UtxoFeeData
    [KnownChainIds.BitcoinCashMainnet]: UtxoFeeData
    [KnownChainIds.CosmosMainnet]: CosmosSdkFeeData
    [KnownChainIds.ThorchainMainnet]: CosmosSdkFeeData
  }
>

export type ProtocolFee = { requiresBalance: boolean } & AmountDisplayMeta

export type QuoteFeeData<T extends ChainId> = {
  networkFeeCryptoBaseUnit: string | undefined // fee paid to the network from the fee asset (undefined if unknown)
  protocolFees: Record<AssetId, ProtocolFee> // fee(s) paid to the protocol(s)
} & ChainSpecificQuoteFeeData<T>

export type SwapperWithQuoteMetadata = {
  swapper: Swapper<ChainId>
  quote: TradeQuote<ChainId>
  inputOutputRatio: number | undefined
}

export type BuyAssetBySellIdInput = {
  sellAssetId: AssetId
  nonNftAssetIds: AssetId[]
}

type CommonTradeInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountBeforeFeesCryptoBaseUnit: string
  sendAddress?: string
  receiveAddress: string
  accountNumber: number
  receiveAccountNumber?: number
  affiliateBps: string
  allowMultiHop: boolean
}

export type GetEvmTradeQuoteInput = CommonTradeInput & {
  chainId: EvmChainId
  supportsEIP1559: boolean
}

export type GetCosmosSdkTradeQuoteInput = CommonTradeInput & {
  chainId: CosmosSdkChainId
}

export type GetUtxoTradeQuoteInput = CommonTradeInput & {
  chainId: UtxoChainId
  accountType: UtxoAccountType
  accountNumber: number
  xpub: string
}

export type GetTradeQuoteInput =
  | GetUtxoTradeQuoteInput
  | GetEvmTradeQuoteInput
  | GetCosmosSdkTradeQuoteInput

export type BuildTradeInput = GetTradeQuoteInput & {
  wallet: HDWallet
  slippage?: string
}

export type AmountDisplayMeta = {
  amountCryptoBaseUnit: string
  asset: Pick<Asset, 'symbol' | 'chainId' | 'precision'>
}

export type TradeBase<C extends ChainId> = {
  buyAmountBeforeFeesCryptoBaseUnit: string
  sellAmountBeforeFeesCryptoBaseUnit: string
  feeData: QuoteFeeData<C>
  rate: string
  sources: SwapSource[]
  buyAsset: Asset
  sellAsset: Asset
  accountNumber: number
  // describes intermediary asset and amount the user may end up with in the event of a trade
  // execution failure
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
}

export type TradeQuoteStep<C extends ChainId> = TradeBase<C> & {
  allowanceContract: string
}

export type TradeQuote<C extends ChainId = ChainId> = {
  minimumCryptoHuman: string
  recommendedSlippage?: string
  id?: string
  steps: TradeQuoteStep<C>[]
}

export type Trade<C extends ChainId> = TradeBase<C> & {
  receiveAddress: string
  receiveAccountNumber?: number
}

export type ExecuteTradeInput<C extends ChainId> = {
  trade: Trade<C>
  wallet: HDWallet
}

export type TradeResult = {
  tradeId: string
}

export type SwapSource = {
  name: SwapperName | string
  proportion: string
}

export enum SwapperName {
  Thorchain = 'THORChain',
  Osmosis = 'Osmosis',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  Test = 'Test',
  LIFI = 'LI.FI',
  OneInch = '1INCH',
}

export type TradeTxs = {
  sellTxid: string
  buyTxid?: string
}

// Swap Errors
export enum SwapErrorType {
  BUILD_TRADE_FAILED = 'BUILD_TRADE_FAILED',
  EXECUTE_TRADE_FAILED = 'EXECUTE_TRADE_FAILED',
  MANAGER_ERROR = 'MANAGER_ERROR',
  MIN_MAX_FAILED = 'MIN_MAX_FAILED',
  RESPONSE_ERROR = 'RESPONSE_ERROR',
  SIGN_AND_BROADCAST_FAILED = 'SIGN_AND_BROADCAST_FAILED',
  TRADE_QUOTE_FAILED = 'TRADE_QUOTE_FAILED',
  TRADE_QUOTE_AMOUNT_TOO_SMALL = 'TRADE_QUOTE_AMOUNT_TOO_SMALL',
  TRADE_QUOTE_INPUT_LOWER_THAN_FEES = 'TRADE_QUOTE_INPUT_LOWER_THAN_FEES',
  UNSUPPORTED_PAIR = 'UNSUPPORTED_PAIR',
  USD_RATE_FAILED = 'USD_RATE_FAILED',
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  UNSUPPORTED_NAMESPACE = 'UNSUPPORTED_NAMESPACE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MAKE_MEMO_FAILED = 'MAKE_MEMO_FAILED',
  PRICE_RATIO_FAILED = 'PRICE_RATIO_FAILED',
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  GET_TRADE_TXS_FAILED = 'GET_TRADE_TXS_FAILED',
  TRADE_FAILED = 'TRADE_FAILED',
  RECEIVE_ACCOUNT_NUMBER_NOT_PROVIDED = 'RECEIVE_ACCOUNT_NUMBER_NOT_PROVIDED',
  TRADE_BELOW_MINIMUM = 'TRADE_BELOW_MINIMUM',
  // Catch-all for XHRs that can fail
  QUERY_FAILED = 'QUERY_FAILED',
  // Catch-all for missing input e.g AssetId missing when making a request
  MISSING_INPUT = 'MISSING_INPUT',
  // Catch-all for happy responses, but entity not found according to our criteria
  NOT_FOUND = 'NOT_FOUND',
}
export interface Swapper<T extends ChainId> {
  /** Human-readable swapper name */
  readonly name: SwapperName

  /** perform any necessary async initialization */
  initialize?(): Promise<Result<unknown, SwapErrorRight>>

  /**
   * Get builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  buildTrade(args: BuildTradeInput): Promise<Result<Trade<T>, SwapErrorRight>>

  /**
   * Get a trade quote
   */
  getTradeQuote(input: GetTradeQuoteInput): Promise<Result<TradeQuote<ChainId>, SwapErrorRight>>

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  executeTrade(args: ExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>>

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[]

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(nonNftAssetIds: AssetId[]): AssetId[]

  /**
   * Get transactions related to a trade
   */
  getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>>
}

export type UnsignedTx = SignTx<keyof ChainSignTx>

export type TradeQuote2 = TradeQuote & {
  id: string
  receiveAddress: string
  receiveAccountNumber?: number
  affiliateBps: string | undefined // undefined if affiliate fees aren't supported by the swapper
}

export type FromOrXpub = { from: string; xpub?: never } | { from?: never; xpub: string }

export type GetUnsignedTxArgs = {
  tradeQuote: TradeQuote2
  chainId: ChainId
  accountMetadata?: AccountMetadata
  stepIndex: number
  supportsEIP1559: boolean
  buyAssetUsdRate: string
  feeAssetUsdRate: string
} & FromOrXpub

// the client should never need to know anything about this payload, and since it varies from
// swapper to swapper, the type is declared this way to prevent generics hell while ensuring the
// data originates from the correct place (assuming no casting).
export type UnsignedTx2 = Nominal<Record<string, any>, 'UnsignedTx2'>

export type ExecuteTradeArgs = {
  txToSign: UnsignedTx2
  wallet: HDWallet
  chainId: ChainId
}

export type CheckTradeStatusInput = {
  quoteId: string
  txHash: string
  chainId: ChainId
  stepIndex: number
  quoteSellAssetAccountId?: AccountId
  quoteBuyAssetAccountId?: AccountId
  getState: () => ReduxState
}

export type Swapper2 = {
  filterAssetIdsBySellable: (assetIds: AssetId[]) => Promise<AssetId[]>
  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput) => Promise<AssetId[]>
  executeTrade: (executeTradeArgs: ExecuteTradeArgs) => Promise<string>
}

export type Swapper2Api = {
  checkTradeStatus: (
    input: CheckTradeStatusInput,
  ) => Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }>
  getTradeQuote: (
    input: GetTradeQuoteInput,
    ...deps: any[]
  ) => Promise<Result<TradeQuote2, SwapErrorRight>>
  getUnsignedTx(input: GetUnsignedTxArgs): Promise<UnsignedTx2>
}
