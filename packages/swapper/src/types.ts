import type { StdSignDoc } from '@keplr-wallet/types'
import type { AccountId, AssetId, ChainId, Nominal } from '@shapeshiftoss/caip'
import type {
  ChainAdapter,
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  UtxoChainAdapter,
} from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type {
  AccountMetadata,
  Asset,
  AssetsByIdPartial,
  CosmosSdkChainId,
  EvmChainId,
  KnownChainIds,
  PartialRecord,
  UtxoAccountType,
  UtxoChainId,
} from '@shapeshiftoss/types'
import type { evm, TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import type { TypedData } from 'eip-712'
import type { InterpolationOptions } from 'node-polyglot'
import type { Address } from 'viem'

import type { CowMessageToSign } from './swappers/CowSwapper/types'
import type { makeSwapperAxiosServiceMonadic } from './utils'

// TODO: Rename all properties in this type to be camel case and not react specific
export type SwapperConfig = {
  REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL: string
  REACT_APP_UNCHAINED_COSMOS_HTTP_URL: string
  REACT_APP_THORCHAIN_NODE_URL: string
  REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS: boolean
  REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL: boolean
  REACT_APP_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL: boolean
  REACT_APP_MIDGARD_URL: string
  REACT_APP_UNCHAINED_BITCOIN_HTTP_URL: string
  REACT_APP_UNCHAINED_DOGECOIN_HTTP_URL: string
  REACT_APP_UNCHAINED_LITECOIN_HTTP_URL: string
  REACT_APP_UNCHAINED_BITCOINCASH_HTTP_URL: string
  REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL: string
  REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL: string
  REACT_APP_UNCHAINED_BNBSMARTCHAIN_HTTP_URL: string
  REACT_APP_COWSWAP_BASE_URL: string
  REACT_APP_PORTALS_BASE_URL: string
  REACT_APP_FEATURE_ZRX_PERMIT2: boolean
  REACT_APP_ZRX_BASE_URL: string
}

export enum SwapperName {
  Thorchain = 'THORChain',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  Test = 'Test',
  LIFI = 'LI.FI',
  ArbitrumBridge = 'Arbitrum Bridge',
  Portals = 'Portals',
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
  // catch-all for unknown issues
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
  config: SwapperConfig
}

type CommonTradeInputBase = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  potentialAffiliateBps: string
  affiliateBps: string
  allowMultiHop: boolean
  slippageTolerancePercentageDecimal?: string
}

export type CommonTradeQuoteInput = CommonTradeInputBase & {
  sendAddress?: string
  receiveAccountNumber?: number
  receiveAddress: string
  accountNumber: number
  quoteOrRate: 'quote'
}

type CommonTradeRateInput = CommonTradeInputBase & {
  sendAddress?: undefined
  receiveAccountNumber?: undefined
  receiveAddress: undefined
  accountNumber: undefined
  quoteOrRate: 'rate'
}

type CommonTradeInput = CommonTradeQuoteInput | CommonTradeRateInput

export type GetEvmTradeQuoteInputBase = CommonTradeQuoteInput & {
  chainId: EvmChainId
  supportsEIP1559: boolean
}
export type GetEvmTradeRateInput = CommonTradeRateInput & {
  chainId: EvmChainId
  supportsEIP1559: false
}
export type GetEvmTradeQuoteInput = GetEvmTradeQuoteInputBase | GetEvmTradeRateInput

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

type GetUtxoTradeRateInput = CommonTradeRateInput & {
  chainId: UtxoChainId
  // We need a dummy script type when getting a quote without a wallet
  // so we always use SegWit (which works across all UTXO chains)
  accountType: UtxoAccountType.P2pkh
  accountNumber: undefined
  xpub: undefined
}

export type GetUtxoTradeQuoteInput = GetUtxoTradeQuoteWithWallet | GetUtxoTradeRateInput

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
export type UtxoSwapperDeps = { assertGetUtxoChainAdapter: (chainId: ChainId) => UtxoChainAdapter }
export type CosmosSdkSwapperDeps = {
  assertGetCosmosSdkChainAdapter: (chainId: ChainId) => CosmosSdkChainAdapter
}

export type SwapperDeps = {
  assetsById: AssetsByIdPartial
  config: SwapperConfig
  assertGetChainAdapter: (chainId: ChainId) => ChainAdapter<KnownChainIds>
} & EvmSwapperDeps &
  UtxoSwapperDeps &
  CosmosSdkSwapperDeps

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
  transactionMetadata?: {
    to: Address
    data: Address
    gasPrice: string | undefined
    gas: string | undefined
    value: string
  }
}

export type TradeRateStep = Omit<TradeQuoteStep, 'accountNumber'> & { accountNumber: undefined }
export type ExecutableTradeStep = Omit<TradeQuoteStep, 'accountNumber'> & { accountNumber: number }

type TradeQuoteBase = {
  id: string
  rate: string // top-level rate for all steps (i.e. output amount / input amount)
  receiveAddress: string | undefined // if receiveAddress is undefined, this is not a trade quote but a trade rate
  receiveAccountNumber?: number
  potentialAffiliateBps: string // even if the swapper does not support affiliateBps, we need to zero-them out or view-layer will be borked
  affiliateBps: string // even if the swapper does not support affiliateBps, we need to zero-them out or view-layer will be borked
  isStreaming?: boolean
  slippageTolerancePercentageDecimal: string | undefined // undefined if slippage limit is not provided or specified by the swapper
  isLongtail?: boolean
}

type TradeRateBase = Omit<TradeQuoteBase, 'receiveAddress'> & { receiveAddress: undefined }

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
export type MultiHopTradeQuote = TradeQuoteBase & {
  steps: MultiHopTradeQuoteSteps
}

// Note: don't try to do TradeQuote = SingleHopTradeQuote | MultiHopTradeQuote here, which would be cleaner but you'll have type errors such as
// "An interface can only extend an object type or intersection of object types with statically known members."
export type TradeQuote = TradeQuoteBase & {
  steps: SingleHopTradeQuoteSteps | MultiHopTradeQuoteSteps
}

export type TradeRate = TradeRateBase & {
  steps: SingleHopTradeRateSteps | MultiHopTradeRateSteps
} & {
  receiveAddress: undefined
  accountNumber: undefined
}

export type TradeQuoteOrRate = TradeQuote | TradeRate

export type ExecutableTradeQuote = TradeQuote & { receiveAddress: string }

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
  signAndBroadcastTransaction: (transactionRequest: EvmTransactionRequest) => Promise<string>
}

export type EvmMessageExecutionProps = {
  signMessage: (messageToSign: TypedData) => Promise<string>
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

export type ExecuteTradeArgs2 = {
  txToSign: UnsignedTx
  wallet: HDWallet
  chainId: ChainId
}

export type CheckTradeStatusInput = {
  quoteId: string
  txHash: string
  chainId: ChainId
  accountId: AccountId | undefined
  stepIndex: SupportedTradeQuoteStepIndex
  config: SwapperConfig
} & EvmSwapperDeps &
  UtxoSwapperDeps &
  CosmosSdkSwapperDeps

// a result containing all routes that were successfully generated, or an error in the case where
// no routes could be generated
type TradeQuoteResult = Result<TradeQuote[], SwapErrorRight>
export type TradeRateResult = Result<TradeRate[], SwapErrorRight>

export type EvmTransactionRequest = {
  gasLimit: string
  to: string
  from: string
  value: string
  data: string
  chainId: number
} & evm.types.Fees

// TODO: one day this might be a union to support various implementations or generic 💀
export type EvmMessageToSign = CowMessageToSign

export type Swapper = {
  filterAssetIdsBySellable: (assets: Asset[], config: SwapperConfig) => Promise<AssetId[]>
  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput) => Promise<AssetId[]>
  executeTrade?: (executeTradeArgs: ExecuteTradeArgs) => Promise<string>

  executeEvmTransaction?: (
    txToSign: EvmTransactionRequest,
    callbacks: EvmTransactionExecutionProps,
  ) => Promise<string>
  executeEvmMessage?: (
    txMetaToSign: EvmMessageToSign,
    callbacks: EvmMessageExecutionProps,
    config: SwapperConfig,
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
  checkTradeStatus: (input: CheckTradeStatusInput) => Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }>
  getTradeQuote: (input: CommonTradeQuoteInput, deps: SwapperDeps) => Promise<TradeQuoteResult>
  getTradeRate: (input: GetTradeRateInput, deps: SwapperDeps) => Promise<TradeRateResult>
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

export type RateResult = Result<TradeRate[], SwapErrorRight> & {
  swapperName: SwapperName
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

export enum TradeExecutionEvent {
  SellTxHash = 'sellTxHash',
  Status = 'status',
  Success = 'success',
  Fail = 'fail',
  Error = 'error',
}

export type SellTxHashArgs = { stepIndex: SupportedTradeQuoteStepIndex; sellTxHash: string }
export type StatusArgs = {
  stepIndex: number
  status: TxStatus
  message?: string | [string, InterpolationOptions]
  buyTxHash?: string
}

export type TradeExecutionEventMap = {
  [TradeExecutionEvent.SellTxHash]: (args: SellTxHashArgs) => void
  [TradeExecutionEvent.Status]: (args: StatusArgs) => void
  [TradeExecutionEvent.Success]: (args: StatusArgs) => void
  [TradeExecutionEvent.Fail]: (args: StatusArgs) => void
  [TradeExecutionEvent.Error]: (args: unknown) => void
}

export type SupportedChainIds = {
  buy: ChainId[]
  sell: ChainId[]
}

export type MonadicSwapperAxiosService = ReturnType<typeof makeSwapperAxiosServiceMonadic>
