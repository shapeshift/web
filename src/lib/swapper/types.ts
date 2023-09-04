import type { StdSignDoc } from '@keplr-wallet/types'
import type { AccountId, AssetId, ChainId, Nominal } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import type { evm, TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { PartialRecord } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export type SwapErrorRight = {
  name: 'SwapError'
  message: string
  cause?: unknown
  details?: unknown
  code?: SwapErrorType
}

export type UtxoFeeData = {
  byteCount: string
  satsPerByte: string
}

export type CosmosSdkFeeData = {
  estimatedGasCryptoBaseUnit: string
}

export type ProtocolFee = { requiresBalance: boolean } & AmountDisplayMeta

export type QuoteFeeData = {
  networkFeeCryptoBaseUnit: string | undefined // fee paid to the network from the fee asset (undefined if unknown)
  protocolFees: PartialRecord<AssetId, ProtocolFee> // fee(s) paid to the protocol(s)
  chainSpecific?: UtxoFeeData | CosmosSdkFeeData
}

export type BuyAssetBySellIdInput = {
  sellAsset: Asset
  assets: Asset[]
}

type CommonTradeInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sendAddress?: string
  receiveAddress: string
  accountNumber: number
  receiveAccountNumber?: number
  affiliateBps: string
  allowMultiHop: boolean
  slippageTolerancePercentage?: string
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

export type AmountDisplayMeta = {
  amountCryptoBaseUnit: string
  asset: Partial<Asset> & Pick<Asset, 'symbol' | 'chainId' | 'precision'>
}

export type TradeQuoteStep = {
  buyAmountBeforeFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  feeData: QuoteFeeData
  rate: string
  source: SwapSource
  buyAsset: Asset
  sellAsset: Asset
  accountNumber: number
  // describes intermediary asset and amount the user may end up with in the event of a trade
  // execution failure
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
  allowanceContract: string
}

export type TradeQuote = {
  estimatedExecutionTimeMs: number | undefined
  id: string
  steps: TradeQuoteStep[]
  rate: string // top-level rate for all steps (i.e. output amount / input amount)
  receiveAddress: string
  receiveAccountNumber?: number
  affiliateBps: string | undefined // undefined if affiliate fees aren't supported by the swapper
  isStreaming?: boolean
}

export type SwapSource = SwapperName | `${SwapperName} • ${string}`

export enum SwapperName {
  Thorchain = 'THORChain',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  Test = 'Test',
  LIFI = 'LI.FI',
  OneInch = '1INCH',
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
  // Catch-all for XHRs that can fail
  QUERY_FAILED = 'QUERY_FAILED',
  // Catch-all for missing input e.g AssetId missing when making a request
  MISSING_INPUT = 'MISSING_INPUT',
  // Catch-all for happy responses, but entity not found according to our criteria
  NOT_FOUND = 'NOT_FOUND',
  TRADING_HALTED = 'TRADING_HALTED',
}

export type FromOrXpub = { from: string; xpub?: never } | { from?: never; xpub: string }

export type CowSwapOrder = {
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: string
  feeAmount: string
  kind: string
  partiallyFillable: boolean
  receiver: string
  sellTokenBalance: string
  buyTokenBalance: string
  quoteId: number
}

export type GetUnsignedTxArgs = {
  tradeQuote: TradeQuote
  chainId: ChainId
  accountMetadata?: AccountMetadata
  stepIndex: number
  supportsEIP1559: boolean
  slippageTolerancePercentageDecimal: string
} & FromOrXpub

export type EvmTradeExecutionProps = {
  signAndBroadcastTransaction: (transactionRequest: EvmTransactionRequest) => Promise<string>
}

export type CowTradeExecutionProps = {
  signMessage: (messageToSign: Uint8Array) => Promise<string>
}

export type UtxoTradeExecutionProps = {
  signAndBroadcastTransaction: (transactionRequest: BTCSignTx) => Promise<string>
}

export type CosmosSdkTradeExecutionProps = {
  signAndBroadcastTransaction: (transactionRequest: StdSignDoc) => Promise<string>
}

type EvmAccountMetadata = { from: string; nonce: string }
type CowAccountMetadata = { from: string }
type UtxoAccountMetadata = { xpub: string; accountType: UtxoAccountType }
type CosmosSdkAccountMetadata = { from: string }

export type CommonGetUnsignedTxArgs = {
  tradeQuote: TradeQuote
  chainId: ChainId
  stepIndex: number
  slippageTolerancePercentageDecimal: string
}

export type GetUnsignedTxArgsEvm = CommonGetUnsignedTxArgs & EvmAccountMetadata
export type GetUnsignedTxArgsCow = CommonGetUnsignedTxArgs & CowAccountMetadata
export type GetUnsignedTxArgsUtxo = CommonGetUnsignedTxArgs & UtxoAccountMetadata
export type GetUnsignedTxArgsCosmosSdk = CommonGetUnsignedTxArgs & CosmosSdkAccountMetadata

// the client should never need to know anything about this payload, and since it varies from
// swapper to swapper, the type is declared this way to prevent generics hell while ensuring the
// data originates from the correct place (assuming no casting).
export type UnsignedTx = Nominal<Record<string, any>, 'UnsignedTx'>

export type ExecuteTradeArgs = {
  txToSign: UnsignedTx
  wallet: HDWallet
  chainId: ChainId
}

export type ExecuteTradeArgs2 = {
  txToSign: UnsignedTx
  wallet: HDWallet
  chainId: ChainId
}

export type CheckTradeStatusInput = {
  quoteId: string
  txHash: string
  chainId: ChainId
  stepIndex: number
}

// a result containing all routes that were successfully generated, or an error in the case where
// no routes could be generated
type TradeQuoteResult = Result<TradeQuote[], SwapErrorRight>

export type EvmTransactionRequest = {
  nonce: string
  gasLimit: string
  to: string
  from: string
  value: string
  data: string
  chainId: number
} & evm.ethereum.Fees

export type CowTransactionRequest = {
  chainId: ChainId
  orderToSign: CowSwapOrder
}

export type Swapper = {
  filterAssetIdsBySellable: (assets: Asset[]) => Promise<AssetId[]>
  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput) => Promise<AssetId[]>
  executeTrade?: (executeTradeArgs: ExecuteTradeArgs) => Promise<string>

  executeTradeEvm?: (
    txToSign: EvmTransactionRequest,
    callbacks: EvmTradeExecutionProps,
  ) => Promise<string>
  executeTradeCow?: (
    txMetaToSign: CowTransactionRequest,
    callbacks: CowTradeExecutionProps,
  ) => Promise<string>
  executeTradeUtxo?: (txToSign: BTCSignTx, callbacks: UtxoTradeExecutionProps) => Promise<string>
  executeTradeCosmosSdk?: (
    txToSign: StdSignDoc,
    callbacks: CosmosSdkTradeExecutionProps,
  ) => Promise<string>
}

export type SwapperApi = {
  checkTradeStatus: (
    input: CheckTradeStatusInput,
  ) => Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }>
  getTradeQuote: (input: GetTradeQuoteInput) => Promise<TradeQuoteResult>
  getUnsignedTx?: (input: GetUnsignedTxArgs) => Promise<UnsignedTx>

  getUnsignedTxEvm?: (input: GetUnsignedTxArgsEvm) => Promise<EvmTransactionRequest>
  getUnsignedTxCow?: (input: GetUnsignedTxArgsCow) => Promise<CowTransactionRequest>
  getUnsignedTxUtxo?: (input: GetUnsignedTxArgsUtxo) => Promise<BTCSignTx>
  getUnsignedTxCosmosSdk?: (input: GetUnsignedTxArgsCosmosSdk) => Promise<StdSignDoc>
}

export type QuoteResult = Result<TradeQuote[], SwapErrorRight> & {
  swapperName: SwapperName
}

export type TradeExecutionInput = {
  swapperName: SwapperName
  tradeQuote: TradeQuote
  stepIndex: number
  accountMetadata: AccountMetadata
  quoteSellAssetAccountId: AccountId
  quoteBuyAssetAccountId: AccountId
  wallet: HDWallet
  supportsEIP1559: boolean
  slippageTolerancePercentageDecimal: string
  getState: () => ReduxState
}

export type CommonTradeExecutionInput = {
  swapperName: SwapperName
  tradeQuote: TradeQuote
  stepIndex: number
  slippageTolerancePercentageDecimal: string
}

export type EvmTradeExecutionInput = CommonTradeExecutionInput &
  EvmTradeExecutionProps &
  EvmAccountMetadata

export type CowTradeExecutionInput = CommonTradeExecutionInput &
  CowTradeExecutionProps &
  CowAccountMetadata

export type UtxoTradeExecutionInput = CommonTradeExecutionInput &
  UtxoTradeExecutionProps &
  UtxoAccountMetadata

export type CosmosSdkTradeExecutionInput = CommonTradeExecutionInput &
  CosmosSdkTradeExecutionProps &
  CosmosSdkAccountMetadata

export enum TradeExecutionEvent {
  SellTxHash = 'sellTxHash',
  Status = 'status',
  Success = 'success',
  Fail = 'fail',
  Error = 'error',
}

export type SellTxHashArgs = { stepIndex: number; sellTxHash: string }
export type StatusArgs = {
  stepIndex: number
  status: TxStatus
  message?: string
  buyTxHash?: string
}

export type TradeExecutionEventMap = {
  [TradeExecutionEvent.SellTxHash]: (args: SellTxHashArgs) => void
  [TradeExecutionEvent.Status]: (args: StatusArgs) => void
  [TradeExecutionEvent.Success]: (args: StatusArgs) => void
  [TradeExecutionEvent.Fail]: (args: StatusArgs) => void
  [TradeExecutionEvent.Error]: (args: unknown) => void
}

export interface TradeExecutionBase {
  on<T extends TradeExecutionEvent>(eventName: T, callback: TradeExecutionEventMap[T]): void

  exec?: (input: TradeExecutionInput) => Promise<{ cancelPolling: () => void } | void>
  execEvm?: (input: EvmTradeExecutionInput) => Promise<{ cancelPolling: () => void } | void>
  execCow?: (input: CowTradeExecutionInput) => Promise<{ cancelPolling: () => void } | void>
  execUtxo?: (input: UtxoTradeExecutionInput) => Promise<{ cancelPolling: () => void } | void>
  execCosmosSdk?: (
    input: CosmosSdkTradeExecutionInput,
  ) => Promise<{ cancelPolling: () => void } | void>
}
