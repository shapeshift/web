import type { StdSignDoc } from '@keplr-wallet/types'
import type { AssetId, ChainId, Nominal } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type {
  AccountMetadata,
  Asset,
  AssetsByIdPartial,
  PartialRecord,
  UtxoAccountType,
} from '@shapeshiftoss/types'
import type { evm, TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'

export enum SwapperName {
  Thorchain = 'THORChain',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  Test = 'Test',
  LIFI = 'LI.FI',
  OneInch = '1INCH',
}

export type SwapSource = SwapperName | `${SwapperName} • ${string}`

export type SwapErrorRight = {
  name: 'SwapError'
  message: string
  cause?: unknown
  details?: unknown
  code?: TradeQuoteError
}

export enum TradeQuoteError {
  NoQuotesAvailableForTradePair = 'NoQuotesAvailableForTradePair', // TODO: rename to UnsupportedTradePair
  TradingHalted = 'TradingHalted',
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  UnknownError = 'UnknownError',
}

export type UtxoFeeData = {
  byteCount: string
  satsPerByte: string
}

export type CosmosSdkFeeData = {
  estimatedGasCryptoBaseUnit: string
}

export type AmountDisplayMeta = {
  amountCryptoBaseUnit: string
  asset: Partial<Asset> & Pick<Asset, 'symbol' | 'chainId' | 'precision'>
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
  potentialAffiliateBps: string
  affiliateBps: string
  allowMultiHop: boolean
  slippageTolerancePercentageDecimal?: string
  // KeepKey is rugged and requires a bandaid to disable affiliate fee for EVM sell assets, see https://github.com/shapeshift/web/issues/4518
  // Since we have a single shared input across all swappers, we need to pass this as feature detection to monkey patch affiliate bps to 0
  isKeepKey: boolean
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
  estimatedExecutionTimeMs: number | undefined
}

export type TradeQuote = {
  id: string
  steps: TradeQuoteStep[]
  rate: string // top-level rate for all steps (i.e. output amount / input amount)
  receiveAddress: string
  receiveAccountNumber?: number
  potentialAffiliateBps: string | undefined // undefined if affiliate fees aren't supported by the swapper
  affiliateBps: string | undefined // undefined if affiliate fees aren't supported by the swapper
  isStreaming?: boolean
  slippageTolerancePercentageDecimal: string | undefined // undefined if slippage limit is not provided or specified by the swapper
  isLongtail?: boolean
}

export type FromOrXpub = { from: string; xpub?: never } | { from?: never; xpub: string }

export type CowSwapOrder = {
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: string
  appDataHash: string
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

export type EvmTransactionExecutionProps = {
  signAndBroadcastTransaction: (transactionRequest: EvmTransactionRequest) => Promise<string>
}

export type EvmMessageExecutionProps = {
  signMessage: (messageToSign: string) => Promise<string>
}

export type UtxoTransactionExecutionProps = {
  signAndBroadcastTransaction: (transactionRequest: BTCSignTx) => Promise<string>
}

export type CosmosSdkTransactionExecutionProps = {
  signAndBroadcastTransaction: (transactionRequest: StdSignDoc) => Promise<string>
}

type EvmAccountMetadata = { from: string }
type UtxoAccountMetadata = { xpub: string; accountType: UtxoAccountType }
type CosmosSdkAccountMetadata = { from: string }

export type CommonGetUnsignedTransactionArgs = {
  tradeQuote: TradeQuote
  chainId: ChainId
  stepIndex: number
  slippageTolerancePercentageDecimal: string
  supportsEIP1559?: boolean
}

export type GetUnsignedEvmTransactionArgs = CommonGetUnsignedTransactionArgs & EvmAccountMetadata
export type GetUnsignedEvmMessageArgs = GetUnsignedEvmTransactionArgs
export type GetUnsignedUtxoTransactionArgs = CommonGetUnsignedTransactionArgs & UtxoAccountMetadata
export type GetUnsignedCosmosSdkTransactionArgs = CommonGetUnsignedTransactionArgs &
  CosmosSdkAccountMetadata

// the client should never need to know anything about this payload, and since it varies from
// swapper to swapper, the type is declared this way to prevent generics hell while ensuring the
// data originates from the correct place (assuming no casting).
export type UnsignedTx = Nominal<Record<string, any>, 'UnsignedTx'>

export type ExecuteTradeArgs = {
  senderAddress: string
  receiverAddress: string
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
  gasLimit: string
  to: string
  from: string
  value: string
  data: string
  chainId: number
} & evm.types.Fees

export type CowMessageToSign = {
  chainId: ChainId
  orderToSign: CowSwapOrder
}

// TODO: one day this might be a union to support various implementations or generic 💀
export type EvmMessageToSign = CowMessageToSign

export type Swapper = {
  filterAssetIdsBySellable: (assets: Asset[]) => Promise<AssetId[]>
  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput) => Promise<AssetId[]>
  executeTrade?: (executeTradeArgs: ExecuteTradeArgs) => Promise<string>

  executeEvmTransaction?: (
    txToSign: EvmTransactionRequest,
    callbacks: EvmTransactionExecutionProps,
  ) => Promise<string>
  executeEvmMessage?: (
    txMetaToSign: EvmMessageToSign,
    callbacks: EvmMessageExecutionProps,
  ) => Promise<string>
  executeUtxoTransaction?: (
    txToSign: BTCSignTx,
    callbacks: UtxoTransactionExecutionProps,
  ) => Promise<string>
  executeCosmosSdkTransaction?: (
    txToSign: StdSignDoc,
    callbacks: CosmosSdkTransactionExecutionProps,
  ) => Promise<string>
}

export type SwapperApi = {
  checkTradeStatus: (
    input: CheckTradeStatusInput,
  ) => Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }>
  getTradeQuote: (
    input: GetTradeQuoteInput,
    assetsById: AssetsByIdPartial,
  ) => Promise<TradeQuoteResult>
  getUnsignedTx?: (input: GetUnsignedTxArgs) => Promise<UnsignedTx>

  getUnsignedEvmTransaction?: (
    input: GetUnsignedEvmTransactionArgs,
  ) => Promise<EvmTransactionRequest>
  getUnsignedEvmMessage?: (input: GetUnsignedEvmMessageArgs) => Promise<EvmMessageToSign>
  getUnsignedUtxoTransaction?: (input: GetUnsignedUtxoTransactionArgs) => Promise<BTCSignTx>
  getUnsignedCosmosSdkTransaction?: (
    input: GetUnsignedCosmosSdkTransactionArgs,
  ) => Promise<StdSignDoc>
}

export type QuoteResult = Result<TradeQuote[], SwapErrorRight> & {
  swapperName: SwapperName
}

export type CommonTradeExecutionInput = {
  swapperName: SwapperName
  tradeQuote: TradeQuote
  stepIndex: number
  slippageTolerancePercentageDecimal: string
}

export type EvmTransactionExecutionInput = CommonTradeExecutionInput &
  EvmTransactionExecutionProps &
  EvmAccountMetadata & { supportsEIP1559: boolean }

export type EvmMessageExecutionInput = CommonTradeExecutionInput &
  EvmMessageExecutionProps &
  EvmAccountMetadata

export type UtxoTransactionExecutionInput = CommonTradeExecutionInput &
  UtxoTransactionExecutionProps &
  UtxoAccountMetadata

export type CosmosSdkTransactionExecutionInput = CommonTradeExecutionInput &
  CosmosSdkTransactionExecutionProps &
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
