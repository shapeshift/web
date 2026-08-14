import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type {
  ChainAdapter,
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  near,
  SignTx,
  solana,
  starknet,
  sui,
  ton,
  tron,
  UtxoChainAdapter,
} from '@shapeshiftoss/chain-adapters'
import type {
  HDWallet,
  SolanaSignTx,
  StarknetSignTx,
  SuiSignTx,
} from '@shapeshiftoss/hdwallet-core'
import type {
  Asset,
  AssetsByIdPartial,
  CosmosSdkChainId,
  EvmChainId,
  KnownChainIds,
  NearChainId,
  OrderCreation,
  PartialRecord,
  SolanaChainId,
  StarknetChainId,
  SuiChainId,
  TonChainId,
  TronChainId,
  UtxoAccountType,
  UtxoChainId,
} from '@shapeshiftoss/types'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
import type { TypedData } from 'eip-712'
import type { Mixpanel } from 'mixpanel-browser'
import type Polyglot from 'node-polyglot'
import type { InterpolationOptions } from 'node-polyglot'

import type { AvnuMetadata } from './swappers/AvnuSwapper/types'
import type { BebopMetadata } from './swappers/BebopSwapper/types'
import type { BobGatewayMetadata } from './swappers/BobGatewaySwapper/types'
import type { ButterSwapTransactionMetadata } from './swappers/ButterSwap/types'
import type { ChainflipMetadata } from './swappers/ChainflipSwapper/types'
import type { CowMessageToSign } from './swappers/CowSwapper/types'
import type { DebridgeMetadata } from './swappers/DebridgeSwapper/utils/types'
import type { NearIntentsMetadata } from './swappers/NearIntentsSwapper/types'
import type { RelayMetadata, RelayTransactionMetadata } from './swappers/RelaySwapper/utils/types'
import type { StonfiMetadata, StonfiTransactionData } from './swappers/StonfiSwapper/types'
import type { SunioTransactionData } from './swappers/SunioSwapper/types'
import type { makeSwapperAxiosServiceMonadic } from './utils'
import type { MayachainMetadata, ThorchainMetadata } from './utils/thorchain/types'

// TODO: Rename all properties in this type to be camel case and not react specific
export type SwapperConfig = {
  VITE_UNCHAINED_THORCHAIN_HTTP_URL: string
  VITE_UNCHAINED_MAYACHAIN_HTTP_URL: string
  VITE_UNCHAINED_COSMOS_HTTP_URL: string
  VITE_THORCHAIN_NODE_URL: string
  VITE_MAYACHAIN_NODE_URL: string
  VITE_TRON_NODE_URL: string
  VITE_TRON_GRID_API_KEY: string
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
  VITE_RELAY_API_URL: string
  VITE_RELAY_API_KEY: string
  VITE_BEBOP_API_KEY: string
  VITE_NEAR_INTENTS_API_KEY: string
  VITE_SUI_NODE_URL: string
  VITE_ACROSS_API_URL: string
  VITE_ACROSS_INTEGRATOR_ID: string
  VITE_ACROSS_API_KEY: string
  VITE_DEBRIDGE_API_URL: string
  VITE_BOB_GATEWAY_API_KEY: string
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
  Relay = 'Relay',
  ButterSwap = 'ButterSwap',
  Bebop = 'Bebop',
  NearIntents = 'NEAR Intents',
  Cetus = 'Cetus',
  Sunio = 'Sun.io',
  Avnu = 'AVNU',
  Stonfi = 'STON.fi',
  Across = 'Across',
  Debridge = 'deBridge',
  BobGateway = 'BOB Gateway',
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
  // the swapper can quote this pair, but can't derive a sell amount from an exact buy amount
  ExactOutputNotSupported = 'ExactOutputNotSupported',
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
  // the swapper performed on chain balance checks and determined the user didn't have the funds to perform the swap
  InsufficientFunds = 'InsufficientFunds',
  // the user's confirmed balance is insufficient — funds may exist but are still confirming on chain (e.g. unconfirmed UTXO deposits)
  InsufficientFundsUnconfirmed = 'InsufficientFundsUnconfirmed',
}

export type AmountDisplayMeta = {
  amountCryptoBaseUnit: string
  asset: Partial<Asset> & Pick<Asset, 'symbol' | 'chainId' | 'precision'>
}

export type ProtocolFee = { requiresBalance: boolean } & AmountDisplayMeta

export type QuoteFeeData = {
  networkFeeCryptoBaseUnit: string | undefined // fee paid to the network from the fee asset (undefined if unknown)
  protocolFees: PartialRecord<AssetId, ProtocolFee> | undefined // fee(s) paid to the protocol(s)
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
  // sendAddress and accountNumber are set when a wallet is connected, undefined when it isn't
  sendAddress?: string
  receiveAddress: string | undefined
  accountNumber: number | undefined
  quoteOrRate: 'rate'
}

export type GetEvmTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: EvmChainId
  supportsEIP1559: boolean
}
export type GetEvmTradeRateInput = CommonTradeRateInput & {
  chainId: EvmChainId
  supportsEIP1559: false
}
export type GetEvmTradeQuoteInputWithWallet = Omit<GetEvmTradeQuoteInput, 'supportsEIP1559'> & {
  wallet: HDWallet
}

export type GetCosmosSdkTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: CosmosSdkChainId
}

export type GetTronTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: TronChainId
}

export type GetCosmosSdkTradeRateInput = CommonTradeRateInput & {
  chainId: CosmosSdkChainId
}

export type GetTronTradeRateInput = CommonTradeRateInput & {
  chainId: TronChainId
}

export type GetNearTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: NearChainId
}

export type GetNearTradeRateInput = CommonTradeRateInput & {
  chainId: NearChainId
}

export type GetTonTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: TonChainId
}

export type GetTonTradeRateInput = CommonTradeRateInput & {
  chainId: TonChainId
}

export type GetSolanaTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: SolanaChainId
}

export type GetSolanaTradeRateInput = CommonTradeRateInput & {
  chainId: SolanaChainId
}

export type GetStarknetTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: StarknetChainId
}

export type GetStarknetTradeRateInput = CommonTradeRateInput & {
  chainId: StarknetChainId
}

export type GetSuiTradeQuoteInput = CommonTradeQuoteInput & {
  chainId: SuiChainId
}

export type GetSuiTradeRateInput = CommonTradeRateInput & {
  chainId: SuiChainId
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
  | GetTronTradeQuoteInput
  | GetNearTradeQuoteInput
  | GetTonTradeQuoteInput
  | GetSolanaTradeQuoteInput
  | GetStarknetTradeQuoteInput
  | GetSuiTradeQuoteInput

export type GetTradeRateInput =
  | GetEvmTradeRateInput
  | GetCosmosSdkTradeRateInput
  | GetUtxoTradeRateInput
  | GetTronTradeRateInput
  | GetNearTradeRateInput
  | GetTonTradeRateInput
  | GetSolanaTradeRateInput
  | GetStarknetTradeRateInput
  | GetSuiTradeRateInput

export type WithExactBuyAmount<
  T extends { sellAmountIncludingProtocolFeesCryptoBaseUnit: string },
> = T extends unknown
  ? Omit<T, 'sellAmountIncludingProtocolFeesCryptoBaseUnit'> & { buyAmountCryptoBaseUnit: string }
  : never

export type GetExactOutputTradeQuoteInput = WithExactBuyAmount<GetTradeQuoteInput>
export type GetExactOutputTradeRateInput = WithExactBuyAmount<GetTradeRateInput>

export type TradeAmount = {
  direction: 'exactIn' | 'exactOut'
  cryptoBaseUnit: string
}

type StepDataBaseArgs = {
  deps: SwapperDeps
  sellAsset: Asset
}

type StepDataRateInput = GetTradeRateInput | GetExactOutputTradeRateInput
type StepDataQuoteInput = GetTradeQuoteInput | GetExactOutputTradeQuoteInput

export type StepDataArgs<Base, Rate = unknown, Quote = unknown> =
  | (StepDataBaseArgs & Base & { type: 'rate'; input: StepDataRateInput; from?: string } & Rate)
  | (StepDataBaseArgs & Base & { type: 'quote'; input: StepDataQuoteInput; from: string } & Quote)

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

export type TronSwapperDeps = {
  assertGetTronChainAdapter: (chainId: ChainId) => tron.ChainAdapter
}
export type SuiSwapperDeps = {
  assertGetSuiChainAdapter: (chainId: ChainId) => sui.ChainAdapter
}

export type NearSwapperDeps = {
  assertGetNearChainAdapter: (chainId: ChainId) => near.ChainAdapter
}

export type StarknetSwapperDeps = {
  assertGetStarknetChainAdapter: (chainId: ChainId) => starknet.ChainAdapter
}

export type TonSwapperDeps = {
  assertGetTonChainAdapter: (chainId: ChainId) => ton.ChainAdapter
}

export type SwapperDeps = {
  assetsById: AssetsByIdPartial
  config: SwapperConfig
  mixPanel: Mixpanel | undefined
  assertGetChainAdapter: (chainId: ChainId) => ChainAdapter<KnownChainIds>
} & EvmSwapperDeps &
  UtxoSwapperDeps &
  CosmosSdkSwapperDeps &
  SolanaSwapperDeps &
  TronSwapperDeps &
  SuiSwapperDeps &
  NearSwapperDeps &
  StarknetSwapperDeps &
  TonSwapperDeps

export type AffiliateFee = {
  assetId: AssetId
  amountCryptoBaseUnit: string
  asset: Asset
  isEstimate?: boolean
}

export type TxBuildData =
  | {
      type: 'evm'
      chainId: number
      to: string
      data: string
      value: string
      gasLimit?: string
      signatureRequired?: { type: 'permit2'; eip712: TypedData }
    }
  | { type: 'utxo'; to: string; opReturnData?: string; value: string }
  | {
      type: 'solana_instructions'
      instructions: TransactionInstruction[]
      addressLookupTableAddresses: string[]
    }
  | { type: 'solana_serialized_tx'; serializedTx: string }
  | {
      type: 'cosmossdk_msg_send'
      chainId: string
      to: string
      denom: string
      value: string
      memo?: string
    }
  | { type: 'cosmossdk_msg_deposit'; chainId: string; value: string; memo: string; coin: string }
  | { type: 'ton'; message: Uint8Array; seqno?: number; expireAt?: number }
  | { type: 'tron'; to: string; data: string; value: string }
  // CowSwap signs an off-chain EIP-712 order and posts it to the CoW API - there is nothing to broadcast
  | { type: 'cowswap'; chainId: ChainId; orderToSign: Omit<OrderCreation, 'signature'> }

export type TradeStepCommon = {
  buyAmountBeforeFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  feeData: QuoteFeeData
  rate: string
  source: SwapSource
  buyAsset: Asset
  sellAsset: Asset
  // describes intermediary asset and amount the user may end up with in the event of a trade
  // execution failure
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
  allowanceContract: string
  estimatedExecutionTimeMs: number | undefined
  swapperMetadata?: SwapperMetadata

  // To be collapsed into transactionData and swapperMetadata
  stonfiTransactionData?: StonfiTransactionData
  sunioTransactionData?: SunioTransactionData

  relayTransactionMetadata?: RelayTransactionMetadata
  butterSwapTransactionMetadata?: ButterSwapTransactionMetadata

  chainflipSpecific?: { depositAddress?: string }

  affiliateFee?: AffiliateFee
}

export type TradeQuoteStep = TradeStepCommon & {
  accountNumber: number
  transactionData?: TxBuildData
}

export type TradeRateStep = TradeStepCommon & {
  // Set when a wallet is connected (e.g. approval-before-quote), undefined when it isn't
  accountNumber: number | undefined
  // Rates are not executable and never carry transaction data
  transactionData?: undefined
}

export type TradeCommon = {
  id: string
  rate: string // top-level rate for all steps (i.e. output amount / input amount)
  affiliateBps: string // even if the swapper does not support affiliateBps, we need to zero-them out or view-layer will be borked
  isStreaming?: boolean
  priceImpactPercentageDecimal?: string
  slippageTolerancePercentageDecimal: string | undefined // undefined if slippage limit is not provided or specified by the swapper
  isLongtail?: boolean
  swapperName: SwapperName // The swapper that generated this quote/rate
  isExactOutput?: boolean
}

type TradeQuoteBase = TradeCommon & {
  receiveAddress: string | undefined // receiveAddress may be undefined without a wallet connected
  quoteOrRate: 'quote' | 'rate'
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
  swapperTxId?: string
  swapperTxLink?: string | undefined
  buyTxHash?: string
  streamingSwap?: StreamingSwapMetadata
  message?: string | [string, InterpolationOptions]
  inboundAddress?: string
}

export type CommonSwapMetadata = {
  stepIndex: SupportedTradeQuoteStepIndex
  quoteId: string
  streamingSwapMetadata?: StreamingSwapMetadata
}

export type SwapperMetadata =
  | RelayMetadata
  | DebridgeMetadata
  | BobGatewayMetadata
  | ChainflipMetadata
  | NearIntentsMetadata
  | AvnuMetadata
  | BebopMetadata
  | ThorchainMetadata
  | MayachainMetadata
  | StonfiMetadata

export type SwapMetadata = CommonSwapMetadata & { swapperMetadata?: SwapperMetadata }

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
  swapperTxId?: string
  swapperTxLink?: string
  statusMessage?: string | [string, Polyglot.InterpolationOptions] | undefined
  sellAccountId: AccountId
  buyAccountId: AccountId | undefined
  receiveAddress: string | undefined
  swapperName: SwapperName
  sellAmountCryptoBaseUnit: string
  expectedBuyAmountCryptoBaseUnit: string
  actualBuyAmountCryptoBaseUnit?: string
  sellAmountCryptoPrecision: string
  expectedBuyAmountCryptoPrecision: string
  txLink?: string
  metadata: SwapMetadata
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
  // Epoch ms after which the quote is no longer safe to execute (provider expiry or fallback)
  deadline: number
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
  /** Sign-only callback for Jito bundle flow (sign without broadcasting) */
  signTransaction?: (txToSign: SolanaSignTx) => Promise<string>
}

// Swapper-specific handoff from getUnsignedSolanaMessage to executeSolanaMessage - both ends are
// implemented by the same swapper
export type BebopSolanaMessageToSign = {
  serializedTx: string
  // RFQ order id - bebop broadcasts by submitting the signature to their own api
  quoteId: string
}

export type AcrossSolanaMessageToSign = {
  serializedTx: string
}

export type SolanaMessageToSign = BebopSolanaMessageToSign | AcrossSolanaMessageToSign

export type SolanaMessageExecutionProps = {
  // Sign only - the swapper submits the signature to its own api (bebop RFQ orders)
  signSerializedTransaction: (serializedTx: string) => Promise<string[]>
  // Sign and broadcast on chain - for pre-signed provider txs we broadcast ourselves (across)
  signAndBroadcastSerializedTransaction: (serializedTx: string) => Promise<string>
}

export type TronTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: tron.TronSignTx) => Promise<string>
}
export type SuiTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: SuiSignTx) => Promise<string>
}
export type NearTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: near.NearSignTx) => Promise<string>
}

export type StarknetTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: StarknetSignTx) => Promise<string>
}

export type TonTransactionExecutionProps = {
  signAndBroadcastTransaction: (txToSign: ton.TonSignTx) => Promise<string>
}

type EvmAccountMetadata = { from: string }
type SolanaAccountMetadata = { from: string }
type TronAccountMetadata = { from: string }
type SuiAccountMetadata = { from: string }
type NearAccountMetadata = { from: string }
type StarknetAccountMetadata = { from: string }
type UtxoAccountMetadata = {
  senderAddress: string
  xpub: string
  accountType: UtxoAccountType
}
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

export type GetUnsignedTronTransactionArgs = CommonGetUnsignedTransactionArgs &
  TronAccountMetadata &
  TronSwapperDeps
export type GetUnsignedSuiTransactionArgs = CommonGetUnsignedTransactionArgs &
  SuiAccountMetadata &
  SuiSwapperDeps
export type GetUnsignedNearTransactionArgs = CommonGetUnsignedTransactionArgs &
  NearAccountMetadata &
  NearSwapperDeps
export type GetUnsignedStarknetTransactionArgs = CommonGetUnsignedTransactionArgs &
  StarknetAccountMetadata &
  StarknetSwapperDeps

type TonAccountMetadata = { from: string }
export type GetUnsignedTonTransactionArgs = CommonGetUnsignedTransactionArgs &
  TonAccountMetadata &
  TonSwapperDeps

export type GetUnsignedEvmMessageArgs = CommonGetUnsignedTransactionArgs &
  EvmAccountMetadata &
  Omit<EvmSwapperDeps, 'fetchIsSmartContractAddressQuery'>
export type GetUnsignedSolanaMessageArgs = CommonGetUnsignedTransactionArgs
export type GetUnsignedUtxoTransactionArgs = CommonGetUnsignedTransactionArgs &
  UtxoAccountMetadata &
  UtxoSwapperDeps
export type GetUnsignedCosmosSdkTransactionArgs = CommonGetUnsignedTransactionArgs &
  CosmosSdkAccountMetadata &
  CosmosSdkSwapperDeps

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
  SolanaSwapperDeps &
  TronSwapperDeps &
  SuiSwapperDeps &
  NearSwapperDeps &
  StarknetSwapperDeps &
  TonSwapperDeps

export type TradeStatus = {
  status: TxStatus
  buyTxHash: string | undefined
  // Set by externally paid swappers, whose client may never see the deposit it reports
  sellTxHash?: string | undefined
  // The swapper/protocol's own identifier for the swap (relayer tx hash, native swap id, order uid)
  swapperTxId?: string | undefined
  // Fully-formed link to the swapper/protocol's own tracker page for the swap
  swapperTxLink?: string | undefined
  message: string | [string, InterpolationOptions] | undefined
  actualBuyAmountCryptoBaseUnit?: string
}

// a result containing all routes that were successfully generated, or an error in the case where
// no routes could be generated
export type TradeQuoteResult = Result<TradeQuote[], SwapErrorRight>
export type TradeRateResult = Result<TradeRate[], SwapErrorRight>

// TODO: one day this might be a union to support various implementations or generic 💀
export type EvmMessageToSign = CowMessageToSign

export type Swapper = {
  supportsExternalPayment?: boolean

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
  executeSolanaMessage?: (
    messageData: SolanaMessageToSign,
    callbacks: SolanaMessageExecutionProps,
    config: SwapperConfig,
  ) => Promise<string>
  executeTronTransaction?: (
    txToSign: tron.TronSignTx,
    callbacks: TronTransactionExecutionProps,
  ) => Promise<string>
  executeSuiTransaction?: (
    txToSign: SuiSignTx,
    callbacks: SuiTransactionExecutionProps,
  ) => Promise<string>
  executeNearTransaction?: (
    txToSign: near.NearSignTx,
    callbacks: NearTransactionExecutionProps,
  ) => Promise<string>
  executeStarknetTransaction?: (
    txToSign: StarknetSignTx,
    callbacks: StarknetTransactionExecutionProps,
  ) => Promise<string>
  executeTonTransaction?: (
    txToSign: ton.TonSignTx,
    callbacks: TonTransactionExecutionProps,
  ) => Promise<string>
}

export type SwapperApi = {
  checkTradeStatus: (input: CheckTradeStatusInput) => Promise<TradeStatus>

  getTradeQuote: (input: GetTradeQuoteInput, deps: SwapperDeps) => Promise<TradeQuoteResult>
  getTradeRate: (input: GetTradeRateInput, deps: SwapperDeps) => Promise<TradeRateResult>

  // Implemented only where upstream can honour an exact buy amount and derive the sell amount
  getExactOutputTradeQuote?: (
    input: GetExactOutputTradeQuoteInput,
    deps: SwapperDeps,
  ) => Promise<TradeQuoteResult>
  getExactOutputTradeRate?: (
    input: GetExactOutputTradeRateInput,
    deps: SwapperDeps,
  ) => Promise<TradeRateResult>

  getUnsignedEvmTransaction?: (input: GetUnsignedEvmTransactionArgs) => Promise<SignTx<EvmChainId>>
  getUnsignedEvmMessage?: (input: GetUnsignedEvmMessageArgs) => Promise<EvmMessageToSign>
  getUnsignedUtxoTransaction?: (
    input: GetUnsignedUtxoTransactionArgs,
  ) => Promise<SignTx<UtxoChainId>>
  getUnsignedCosmosSdkTransaction?: (
    input: GetUnsignedCosmosSdkTransactionArgs,
  ) => Promise<SignTx<CosmosSdkChainId>>
  getUnsignedSolanaTransaction?: (input: GetUnsignedSolanaTransactionArgs) => Promise<SolanaSignTx>
  getUnsignedSolanaMessage?: (input: GetUnsignedSolanaMessageArgs) => Promise<SolanaMessageToSign>
  getUnsignedTronTransaction?: (input: GetUnsignedTronTransactionArgs) => Promise<tron.TronSignTx>
  getUnsignedSuiTransaction?: (input: GetUnsignedSuiTransactionArgs) => Promise<SuiSignTx>
  getUnsignedNearTransaction?: (input: GetUnsignedNearTransactionArgs) => Promise<near.NearSignTx>
  getUnsignedStarknetTransaction?: (
    input: GetUnsignedStarknetTransactionArgs,
  ) => Promise<StarknetSignTx>
  getUnsignedTonTransaction?: (input: GetUnsignedTonTransactionArgs) => Promise<ton.TonSignTx>

  getEvmTransactionFees?: (input: GetUnsignedEvmTransactionArgs) => Promise<string>
  getSolanaTransactionFees?: (input: GetUnsignedSolanaTransactionArgs) => Promise<string>
  getSuiTransactionFees?: (input: GetUnsignedSuiTransactionArgs) => Promise<string>
  getUtxoTransactionFees?: (input: GetUnsignedUtxoTransactionArgs) => Promise<string>
  getCosmosSdkTransactionFees?: (input: GetUnsignedCosmosSdkTransactionArgs) => Promise<string>
  getTronTransactionFees?: (input: GetUnsignedTronTransactionArgs) => Promise<string>
  getNearTransactionFees?: (input: GetUnsignedNearTransactionArgs) => Promise<string>
  getStarknetTransactionFees?: (input: GetUnsignedStarknetTransactionArgs) => Promise<string>
  getTonTransactionFees?: (input: GetUnsignedTonTransactionArgs) => Promise<string>
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
  EvmAccountMetadata & {
    supportsEIP1559: boolean
    permit2Signature: string | undefined
  }

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

export type SolanaMessageExecutionInput = CommonTradeExecutionInput & SolanaMessageExecutionProps

export type TronTransactionExecutionInput = CommonTradeExecutionInput &
  TronTransactionExecutionProps &
  TronAccountMetadata
export type SuiTransactionExecutionInput = CommonTradeExecutionInput &
  SuiTransactionExecutionProps &
  SuiAccountMetadata
export type NearTransactionExecutionInput = CommonTradeExecutionInput &
  NearTransactionExecutionProps &
  NearAccountMetadata

export type StarknetTransactionExecutionInput = CommonTradeExecutionInput &
  StarknetTransactionExecutionProps &
  StarknetAccountMetadata

export type TonTransactionExecutionInput = CommonTradeExecutionInput &
  TonTransactionExecutionProps &
  TonAccountMetadata

export enum TradeExecutionEvent {
  SellTxHash = 'sellTxHash',
  Status = 'status',
  Success = 'success',
  Fail = 'fail',
  Error = 'error',
}

export type SellTxHashArgs = {
  stepIndex: SupportedTradeQuoteStepIndex
  sellTxHash: string
}
export type StatusArgs = TradeStatus & {
  stepIndex: number
}

export type TradeExecutionEventMap = {
  [TradeExecutionEvent.SellTxHash]: (args: SellTxHashArgs) => void
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
