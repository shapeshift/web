import type { QuoteResponse } from '@jup-ag/api'
import type { AccountId, AssetId, ChainId, Nominal } from '@shapeshiftoss/caip'
import type {
  ChainAdapter,
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  SignTx,
  solana,
  UtxoChainAdapter,
} from '@shapeshiftoss/chain-adapters'
import type { HDWallet, SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type {
  AccountMetadata,
  Asset,
  AssetsByIdPartial,
  CosmosSdkChainId,
  EvmChainId,
  KnownChainIds,
  OrderQuoteResponse,
  PartialRecord,
  UtxoAccountType,
  UtxoChainId,
} from '@shapeshiftoss/types'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
import type { TypedData } from 'eip-712'
import type { Mixpanel } from 'mixpanel-browser'
import type { InterpolationOptions } from 'node-polyglot'
import type Polyglot from 'node-polyglot'
import type { Address, Hex } from 'viem'

import type { CowMessageToSign } from './swappers/CowSwapper/types'
import type { RelayTransactionMetadata } from './swappers/RelaySwapper/utils/types'
import type { makeSwapperAxiosServiceMonadic } from './utils'

// TODO: Rename all properties in this type to be camel case and not react specific
export type SwapperConfig = {
  VITE_UNCHAINED_THORCHAIN_HTTP_URL: string
  VITE_UNCHAINED_MAYACHAIN_HTTP_URL: string
  VITE_UNCHAINED_COSMOS_HTTP_URL: string
  VITE_THORCHAIN_NODE_URL: string
  VITE_MAYACHAIN_NODE_URL: string
  VITE_FEATURE_THORCHAINSWAP_LONGTAIL: boolean
  VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL: boolean
  VITE_THORCHAIN_MIDGARD_URL: string
  VITE_MAYACHAIN_MIDGARD_URL: string
  VITE_UNCHAINED_BITCOIN_HTTP_URL: string
  VITE_UNCHAINED_DOGECOIN_HTTP_URL: string
  VITE_UNCHAINED_LITECOIN_HTTP_URL: string
  VITE_UNCHAINED_BITCOINCASH_HTTP_URL: string
  VITE_UNCHAINED_ETHEREUM_HTTP_URL: string
  VITE_UNCHAINED_AVALANCHE_HTTP_URL: string
  VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL: string
  VITE_UNCHAINED_BASE_HTTP_URL: string
  VITE_COWSWAP_BASE_URL: string
  VITE_PORTALS_BASE_URL: string
  VITE_ZRX_BASE_URL: string
  VITE_CHAINFLIP_API_KEY: string
  VITE_CHAINFLIP_API_URL: string
  VITE_FEATURE_CHAINFLIP_SWAP_DCA: boolean
  VITE_JUPITER_API_URL: string
  VITE_RELAY_API_URL: string
  VITE_BEBOP_API_KEY: string
}

export enum SwapperName {
  Thorchain = 'THORChain',
  Mayachain = 'MAYAChain',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  Test = 'Test',
  ArbitrumBridge = 'Arbitrum Bridge',
  Portals = 'Portals',
  Chainflip = 'Chainflip',
  Jupiter = 'Jupiter',
  Relay = 'Relay',
  ButterSwap = 'ButterSwap',
  Bebop = 'Bebop',
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
  // the swapper was unable to find a quote for this pair
  UnsupportedTradePair = 'UnsupportedTradePair',
  // the swapper does support the pair buy couldn't find a route for the amount specified
  NoRouteFound = 'NoRouteFound',
  // the swapper doesn't support the chain
  UnsupportedChain = 'UnsupportedChain',
  // the swapper can't swap across chains
  CrossChainNotSupported = 'CrossChainNotSupported',
  // the swapper wasn't able to get a network fee estimate
  NetworkFeeEstimationFailed = 'NetworkFeeEstimationFailed',
  // trading has been halted upstream
  TradingHalted = 'TradingHalted',
  // the sell amount was lower than the minimum defined upstream
  SellAmountBelowMinimum = 'SellAmountBelowMinimum',
  // the fees exceed the sell amount
  SellAmountBelowTradeFee = 'SellAmountBelowTradeFee',
  // the swapper has exceeded its rate limit
  RateLimitExceeded = 'RateLimitExceeded',
  // catch-all for XHRs that can fail
  QueryFailed = 'QueryFailed',
  // the response from the API was invalid or unexpected
  InvalidResponse = 'InvalidResponse',
  // an assertion triggered, indicating a bug
  InternalError = 'InternalError',
  // The max. slippage allowed for this trade has been exceeded at final quote time, as returned by the active quote swapper's API upstream
  FinalQuoteMaxSlippageExceeded = 'FinalQuoteMaxSlippageExceeded',
  // Execution reverted at final quote time, as returned by the active quote swapper's API upstream
  FinalQuoteExecutionReverted = 'FinalQuoteExecutionReverted',
  // Didn't fetch quote/rate in time and aborted
  Timeout = 'Timeout',
  // catch-all for unknown issues
  UnknownError = 'UnknownError',
}

export type UtxoFeeData = {
  satsPerByte: string
}

export type CosmosSdkFeeData = {
  estimatedGasCryptoBaseUnit: string
}

export type SolanaFeeData = {
  computeUnits: string
  priorityFee: string
}

export type AmountDisplayMeta = {
  amountCryptoBaseUnit: string
  asset: Partial<Asset> & Pick<Asset, 'symbol' | 'chainId' | 'precision'>
}

export type ProtocolFee = { requiresBalance: boolean } & AmountDisplayMeta

export type QuoteFeeData = {
  networkFeeCryptoBaseUnit: string | undefined // fee paid to the network from the fee asset (undefined if unknown)
  protocolFees: PartialRecord<AssetId, ProtocolFee> | undefined // fee(s) paid to the protocol(s)
  chainSpecific?: UtxoFeeData | CosmosSdkFeeData | SolanaFeeData
}

export type BuyAssetBySellIdInput = {
  sellAsset: Asset
  assets: Asset[]
  config: SwapperConfig
}

type CommonTradeInputBase = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  affiliateBps: string
  allowMultiHop: boolean
  slippageTolerancePercentageDecimal?: string
}

export type CommonTradeQuoteInput = CommonTradeInputBase & {
  sendAddress?: string
  receiveAddress: string
  accountNumber: number
  quoteOrRate: 'quote'
}

type CommonTradeRateInput = CommonTradeInputBase & {
  sendAddress?: undefined
  receiveAddress: string | undefined
  accountNumber: undefined
  quoteOrRate: 'rate'
}

type CommonTradeInput = CommonTradeQuoteInput

export type GetEvmTradeQuoteInputBase = CommonTradeQuoteInput & {
  chainId: EvmChainId
  supportsEIP1559: boolean
}
export type GetEvmTradeRateInput = CommonTradeRateInput & {
  chainId: EvmChainId
  supportsEIP1559: false
}
export type GetEvmTradeQuoteInput = GetEvmTradeQuoteInputBase
export type GetEvmTradeQuoteInputWithWallet = Omit<GetEvmTradeQuoteInputBase, 'supportsEIP1559'> & {
  wallet: HDWallet
}

export type GetCosmosSdkTradeQuoteInputBase = CommonTradeQuoteInput & {
  chainId: CosmosSdkChainId
}

export type GetCosmosSdkTradeQuoteInput = CommonTradeInput & {
  chainId: CosmosSdkChainId
}

export type GetCosmosSdkTradeRateInput = CommonTradeRateInput & {
  chainId: CosmosSdkChainId
}

type GetUtxoTradeQuoteWithWallet = CommonTradeQuoteInput & {
  chainId: UtxoChainId
  accountType: UtxoAccountType
  accountNumber: number
  xpub: string
}

export type GetUtxoTradeRateInput = CommonTradeRateInput & {
  chainId: UtxoChainId
  accountType: UtxoAccountType
  // accountNumber and accountType may be undefined if no wallet is connected
  // accountType will default to UtxoAccountType.P2pkh without a wallet connected
  accountNumber: number | undefined
  xpub: string | undefined
}

export type GetUtxoTradeQuoteInput = GetUtxoTradeQuoteWithWallet

export type GetTradeQuoteInput =
  | GetUtxoTradeQuoteInput
  | GetEvmTradeQuoteInput
  | GetCosmosSdkTradeQuoteInput

export type GetTradeRateInput =
  | GetEvmTradeRateInput
  | GetCosmosSdkTradeRateInput
  | GetUtxoTradeRateInput

export type GetTradeQuoteInputWithWallet =
  | GetUtxoTradeQuoteWithWallet
  | GetEvmTradeQuoteInputBase
  | GetCosmosSdkTradeQuoteInputBase

export type EvmSwapperDeps = {
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
  fetchIsSmartContractAddressQuery: (userAddress: string, chainId: ChainId) => Promise<boolean>
}

export type UtxoSwapperDeps = {
  assertGetUtxoChainAdapter: (chainId: ChainId) => UtxoChainAdapter
}

export type CosmosSdkSwapperDeps = {
  assertGetCosmosSdkChainAdapter: (chainId: ChainId) => CosmosSdkChainAdapter
}

export type SolanaSwapperDeps = {
  assertGetSolanaChainAdapter: (chainId: ChainId) => solana.ChainAdapter
}

export type SwapperDeps = {
  assetsById: AssetsByIdPartial
  config: SwapperConfig
  mixPanel: Mixpanel | undefined
  assertGetChainAdapter: (chainId: ChainId) => ChainAdapter<KnownChainIds>
} & EvmSwapperDeps &
  UtxoSwapperDeps &
  CosmosSdkSwapperDeps &
  SolanaSwapperDeps

export type TradeQuoteStep = {
  buyAmountBeforeFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  feeData: QuoteFeeData
  rate: string
  source: SwapSource
  buyAsset: Asset
  sellAsset: Asset
  // Undefined in case this is a trade rate - this means we *cannot* execute this guy
  accountNumber: number | undefined
  // describes intermediary asset and amount the user may end up with in the event of a trade
  // execution failure
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
  allowanceContract: string
  estimatedExecutionTimeMs: number | undefined
  permit2Eip712?: TypedData
  zrxTransactionMetadata?: {
    to: Address
    data: Address
    gasPrice: string | undefined
    gas: string | undefined
    value: string
  }
  portalsTransactionMetadata?: {
    to: Address
    from: Address
    data: string
    value: string
    gasLimit: string
  }
  bebopTransactionMetadata?: {
    to: Address
    data: Hex
    value: Hex
    gas?: string
  }
  jupiterQuoteResponse?: QuoteResponse
  solanaTransactionMetadata?: {
    addressLookupTableAddresses: string[]
    instructions?: TransactionInstruction[]
  }
  cowswapQuoteResponse?: OrderQuoteResponse
  chainflipSpecific?: {
    chainflipSwapId?: number
    chainflipDepositAddress?: string
    chainflipNumberOfChunks?: number
    chainflipChunkIntervalBlocks?: number
    chainflipMaxBoostFee?: number
  }
  thorchainSpecific?: {
    maxStreamingQuantity?: number
  }
  relayTransactionMetadata?: RelayTransactionMetadata
  butterSwapTransactionMetadata?: {
    to: string
    data: string
    value: Hex
    gasLimit: string
  }
}

export type TradeRateStep = Omit<TradeQuoteStep, 'accountNumber'> & { accountNumber: undefined }
export type ExecutableTradeStep = Omit<TradeQuoteStep, 'accountNumber'> & { accountNumber: number }

type TradeQuoteBase = {
  id: string
  rate: string // top-level rate for all steps (i.e. output amount / input amount)
  receiveAddress: string | undefined // receiveAddress may be undefined without a wallet connected
  affiliateBps: string // even if the swapper does not support affiliateBps, we need to zero-them out or view-layer will be borked
  isStreaming?: boolean
  priceImpactPercentageDecimal?: string
  slippageTolerancePercentageDecimal: string | undefined // undefined if slippage limit is not provided or specified by the swapper
  isLongtail?: boolean
  quoteOrRate: 'quote' | 'rate'
  swapperName: SwapperName // The swapper that generated this quote/rate
}

export type StreamingSwapFailedSwap = {
  reason: string
  swapIndex: number
}

export type StreamingSwapMetadata = {
  attemptedSwapCount: number
  maxSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
}

export enum TransactionExecutionState {
  AwaitingConfirmation = 'AwaitingConfirmation',
  Pending = 'Pending',
  Complete = 'Complete',
  Failed = 'Failed',
}

export type SwapExecutionMetadata = {
  state: TransactionExecutionState
  sellTxHash?: string
  relayerTxHash?: string
  relayerExplorerTxLink?: string | undefined
  buyTxHash?: string
  streamingSwap?: StreamingSwapMetadata
  message?: string | [string, InterpolationOptions]
}

export type SwapperSpecificMetadata = {
  chainflipSwapId: number | undefined
  relayTransactionMetadata: RelayTransactionMetadata | undefined
  relayerExplorerTxLink: string | undefined
  relayerTxHash: string | undefined
  stepIndex: SupportedTradeQuoteStepIndex
  quoteId: string
  streamingSwapMetadata: StreamingSwapMetadata | undefined
}

export enum SwapStatus {
  Idle = 'idle',
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
}

export type Swap = {
  id: string
  createdAt: number
  updatedAt: number
  sellAsset: Asset
  buyAsset: Asset
  status: SwapStatus
  source: SwapSource
  sellTxHash?: string
  buyTxHash?: string
  statusMessage?: string | [string, Polyglot.InterpolationOptions] | undefined
  sellAccountId: AccountId
  buyAccountId: AccountId | undefined
  receiveAddress: string | undefined
  swapperName: SwapperName
  sellAmountCryptoBaseUnit: string
  expectedBuyAmountCryptoBaseUnit: string
  sellAmountCryptoPrecision: string
  expectedBuyAmountCryptoPrecision: string
  txLink?: string
  metadata: SwapperSpecificMetadata
  isStreaming?: boolean
}

// https://github.com/microsoft/TypeScript/pull/40002
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>
type TupleOf<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never
// A trade quote can *technically* contain one or many steps, depending on the specific swap/swapper
// However, it *effectively* contains 1 or 2 steps only for now
// Whenever this changes, MultiHopTradeQuoteSteps should be updated to reflect it, with TupleOf<TradeQuoteStep, n>
// where n is a sane max number of steps between 3 and 100
export type SingleHopTradeQuoteSteps = TupleOf<TradeQuoteStep, 1>
export type MultiHopTradeQuoteSteps = TupleOf<TradeQuoteStep, 2>

export type SingleHopTradeRateSteps = TupleOf<TradeRateStep, 1>
export type MultiHopTradeRateSteps = TupleOf<TradeRateStep, 2>

export type SupportedTradeQuoteStepIndex = 0 | 1

export type SingleHopTradeQuote = TradeQuoteBase & {
  steps: SingleHopTradeQuoteSteps
}
// Note: don't try to do TradeQuote = SingleHopTradeQuote | MultiHopTradeQuote here, which would be cleaner but you'll have type errors such as
// "An interface can only extend an object type or intersection of object types with statically known members."
export type TradeQuote = TradeQuoteBase & {
  steps: SingleHopTradeQuoteSteps | MultiHopTradeQuoteSteps
} & {
  quoteOrRate: 'quote'
  receiveAddress: string
}

export type MultiHopTradeQuote = TradeQuote & {
  steps: MultiHopTradeQuoteSteps
}

export type MultiHopTradeRate = TradeRate & {
  steps: MultiHopTradeRateSteps
}

export type TradeRate = TradeQuoteBase & {
  steps: SingleHopTradeRateSteps | MultiHopTradeRateSteps
} & {
  quoteOrRate: 'rate'
}

export type FromOrXpub = { from: string; xpub?: never } | { from?: never; xpub: string }

export type GetUnsignedTxArgs = {
  tradeQuote: TradeQuote
  chainId: ChainId
  accountMetadata?: AccountMetadata
  stepIndex: number
  supportsEIP1559: boolean
  slippageTolerancePercentageDecimal: string
} & FromOrXpub

export type EvmTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: SignTx<EvmChainId>) => Promise<string>
}

export type EvmMessageExecutionProps = {
  signMessage: (messageToSign: TypedData) => Promise<string>
}

export type UtxoTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: SignTx<UtxoChainId>) => Promise<string>
}

export type CosmosSdkTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: SignTx<CosmosSdkChainId>) => Promise<string>
}

export type SolanaTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: SolanaSignTx) => Promise<string>
}

type EvmAccountMetadata = { from: string }
type SolanaAccountMetadata = { from: string }
type UtxoAccountMetadata = { senderAddress: string; xpub: string; accountType: UtxoAccountType }
type CosmosSdkAccountMetadata = { from: string }

export type CommonGetUnsignedTransactionArgs = {
  tradeQuote: TradeQuote
  chainId: ChainId
  stepIndex: SupportedTradeQuoteStepIndex
  slippageTolerancePercentageDecimal: string
  config: SwapperConfig
}

export type GetUnsignedEvmTransactionArgs = CommonGetUnsignedTransactionArgs &
  EvmAccountMetadata &
  Omit<EvmSwapperDeps, 'fetchIsSmartContractAddressQuery'> & {
    permit2Signature: string | undefined
    supportsEIP1559: boolean
  }

export type GetUnsignedSolanaTransactionArgs = CommonGetUnsignedTransactionArgs &
  SolanaAccountMetadata &
  SolanaSwapperDeps

export type GetUnsignedEvmMessageArgs = CommonGetUnsignedTransactionArgs &
  EvmAccountMetadata &
  Omit<EvmSwapperDeps, 'fetchIsSmartContractAddressQuery'>
export type GetUnsignedUtxoTransactionArgs = CommonGetUnsignedTransactionArgs &
  UtxoAccountMetadata &
  UtxoSwapperDeps
export type GetUnsignedCosmosSdkTransactionArgs = CommonGetUnsignedTransactionArgs &
  CosmosSdkAccountMetadata &
  CosmosSdkSwapperDeps

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

export type CheckTradeStatusInput = {
  txHash: string
  chainId: ChainId
  address: string | undefined
  stepIndex: SupportedTradeQuoteStepIndex
  config: SwapperConfig
  swap: Swap | undefined
} & EvmSwapperDeps &
  UtxoSwapperDeps &
  CosmosSdkSwapperDeps &
  SolanaSwapperDeps

export type TradeStatus = {
  status: TxStatus
  buyTxHash: string | undefined
  relayerTxHash?: string | undefined
  relayerExplorerTxLink?: string | undefined
  message: string | [string, InterpolationOptions] | undefined
}

// a result containing all routes that were successfully generated, or an error in the case where
// no routes could be generated
export type TradeQuoteResult = Result<TradeQuote[], SwapErrorRight>
export type TradeRateResult = Result<TradeRate[], SwapErrorRight>

// TODO: one day this might be a union to support various implementations or generic 💀
export type EvmMessageToSign = CowMessageToSign

export type Swapper = {
  executeTrade?: (executeTradeArgs: ExecuteTradeArgs) => Promise<string>

  executeEvmTransaction?: (
    txToSign: SignTx<EvmChainId>,
    callbacks: EvmTransactionExecutionProps,
  ) => Promise<string>
  executeEvmMessage?: (
    txMetaToSign: EvmMessageToSign,
    callbacks: EvmMessageExecutionProps,
    config: SwapperConfig,
  ) => Promise<string>
  executeUtxoTransaction?: (
    txToSign: SignTx<UtxoChainId>,
    callbacks: UtxoTransactionExecutionProps,
  ) => Promise<string>
  executeCosmosSdkTransaction?: (
    txToSign: SignTx<CosmosSdkChainId>,
    callbacks: CosmosSdkTransactionExecutionProps,
  ) => Promise<string>
  executeSolanaTransaction?: (
    txToSign: SolanaSignTx,
    callbacks: SolanaTransactionExecutionProps,
  ) => Promise<string>
}

export type SwapperApi = {
  checkTradeStatus: (input: CheckTradeStatusInput) => Promise<TradeStatus>

  getTradeQuote: (input: CommonTradeQuoteInput, deps: SwapperDeps) => Promise<TradeQuoteResult>
  getTradeRate: (input: GetTradeRateInput, deps: SwapperDeps) => Promise<TradeRateResult>
  getUnsignedTx?: (input: GetUnsignedTxArgs) => Promise<UnsignedTx>

  getUnsignedEvmTransaction?: (input: GetUnsignedEvmTransactionArgs) => Promise<SignTx<EvmChainId>>
  getUnsignedEvmMessage?: (input: GetUnsignedEvmMessageArgs) => Promise<EvmMessageToSign>
  getUnsignedUtxoTransaction?: (
    input: GetUnsignedUtxoTransactionArgs,
  ) => Promise<SignTx<UtxoChainId>>
  getUnsignedCosmosSdkTransaction?: (
    input: GetUnsignedCosmosSdkTransactionArgs,
  ) => Promise<SignTx<CosmosSdkChainId>>
  getUnsignedSolanaTransaction?: (input: GetUnsignedSolanaTransactionArgs) => Promise<SolanaSignTx>

  getEvmTransactionFees?: (input: GetUnsignedEvmTransactionArgs) => Promise<string>
  getSolanaTransactionFees?: (input: GetUnsignedSolanaTransactionArgs) => Promise<string>
  getUtxoTransactionFees?: (input: GetUnsignedUtxoTransactionArgs) => Promise<string>
  getCosmosSdkTransactionFees?: (input: GetUnsignedCosmosSdkTransactionArgs) => Promise<string>
}

export type QuoteResult = Result<TradeQuote[], SwapErrorRight> & {
  swapperName: SwapperName
}

export type RateResult = Result<TradeRate[], SwapErrorRight> & {
  swapperName: SwapperName
  fallback?: Promise<Result<TradeRate[], SwapErrorRight>>
}

export type CommonTradeExecutionInput = {
  swapperName: SwapperName
  tradeQuote: TradeQuote
  stepIndex: SupportedTradeQuoteStepIndex
  slippageTolerancePercentageDecimal: string
}

export type EvmTransactionExecutionInput = CommonTradeExecutionInput &
  EvmTransactionExecutionProps &
  EvmAccountMetadata & { supportsEIP1559: boolean; permit2Signature: string | undefined }

export type EvmMessageExecutionInput = CommonTradeExecutionInput &
  EvmMessageExecutionProps &
  EvmAccountMetadata

export type UtxoTransactionExecutionInput = CommonTradeExecutionInput &
  UtxoTransactionExecutionProps &
  UtxoAccountMetadata

export type CosmosSdkTransactionExecutionInput = CommonTradeExecutionInput &
  CosmosSdkTransactionExecutionProps &
  CosmosSdkAccountMetadata

export type SolanaTransactionExecutionInput = CommonTradeExecutionInput &
  SolanaTransactionExecutionProps &
  SolanaAccountMetadata

export enum TradeExecutionEvent {
  SellTxHash = 'sellTxHash',
  RelayerTxHash = 'relayerTxHash',
  Status = 'status',
  Success = 'success',
  Fail = 'fail',
  Error = 'error',
}

export type SellTxHashArgs = { stepIndex: SupportedTradeQuoteStepIndex; sellTxHash: string }
export type RelayerTxDetailsArgs = {
  stepIndex: SupportedTradeQuoteStepIndex
  relayerTxHash: string
  relayerExplorerTxLink: string
}
export type StatusArgs = TradeStatus & {
  stepIndex: number
}

export type TradeExecutionEventMap = {
  [TradeExecutionEvent.SellTxHash]: (args: SellTxHashArgs) => void
  [TradeExecutionEvent.RelayerTxHash]: (args: RelayerTxDetailsArgs) => void
  [TradeExecutionEvent.Status]: (args: StatusArgs) => void
  [TradeExecutionEvent.Success]: (args: StatusArgs) => void
  [TradeExecutionEvent.Fail]: (args: StatusArgs) => void
  [TradeExecutionEvent.Error]: (args: unknown) => void
}

export type MonadicSwapperAxiosService = ReturnType<typeof makeSwapperAxiosServiceMonadic>

export enum MixPanelEvent {
  RelayMultiHop = 'Unable to execute Relay multi-hop quote',
  RelayStepMultipleItems = 'Unable to execute relay quote because step contains multiple items',
}
