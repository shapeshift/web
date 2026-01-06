# Yield.xyz POC Implementation Plan

> This is a POC implementation plan. Visual work will likely be thrown away, but queries/hooks/CSP/types can be kept.

## Overview

Simple, React Query-driven integration with Yield.xyz API. No defi abstraction, no Redux for yield data - just direct API client + hooks + simple components.

---

## Phase 1: Foundation

### 1.0 TypeScript Types (FIRST)

Create `src/lib/yieldxyz/types.ts` with comprehensive types derived from actual API responses:

```typescript
// ============================================================================
// Token Types
// ============================================================================

export type YieldToken = {
  address?: string           // Contract address (undefined for native tokens)
  symbol: string             // e.g., "USDC", "ETH"
  name: string               // e.g., "USD Coin", "Ethereum"
  decimals: number           // Token precision (e.g., 6 for USDC, 18 for ETH)
  network: string            // Network ID (e.g., "base", "ethereum")
  logoURI: string            // Token icon URL (often from assets.stakek.it)
  coinGeckoId?: string       // CoinGecko ID for pricing
  isPoints?: boolean         // True for points-based rewards (not tradeable)
}

// ============================================================================
// Reward Rate Types
// ============================================================================

export enum YieldSource {
  Staking = 'staking',
  Lending = 'lending',
  Incentive = 'incentive',
  Mev = 'mev',
  Points = 'points',
  Unknown = 'unknown',
}

export type RewardRateComponent = {
  rate: number               // Percentage rate (e.g., 3.5 = 3.5%)
  rateType: 'APY' | 'APR'
  token: YieldToken          // Reward token (may differ from input token)
  yieldSource: YieldSource   // Source of yield
  description: string        // Human-readable description
}

export type YieldRewardRate = {
  total: number              // Total combined rate
  rateType: 'APY' | 'APR'
  components: RewardRateComponent[]
}

// ============================================================================
// Schema Types (for dynamic form generation)
// ============================================================================

export type YieldArgumentFieldType = 'string' | 'number' | 'boolean'

export type YieldArgumentField = {
  name: string               // Field identifier (e.g., "amount", "validatorAddress")
  type: YieldArgumentFieldType
  label: string              // Display label
  description: string        // Help text
  required: boolean
  placeholder?: string
  minimum?: string           // Minimum value (as string for precision)
  maximum?: string | null    // Maximum value (null = no max)
  isArray: boolean           // Whether field accepts array values
  options?: string[]         // For enum-like fields (e.g., fee configuration IDs)
  optionsRef?: string        // Reference to external options (e.g., "feeConfigurations", "validators")
}

export type YieldArguments = {
  enter: { fields: YieldArgumentField[] }
  exit: { fields: YieldArgumentField[] }
}

// ============================================================================
// Yield Mechanics Types
// ============================================================================

export enum YieldMechanicType {
  Vault = 'vault',
  Lending = 'lending',
  Staking = 'staking',
  Restaking = 'restaking',
  LiquidStaking = 'liquid-staking',
}

export type YieldEntryLimits = {
  minimum: string            // Minimum entry amount (human-readable)
  maximum: string | null     // Maximum entry amount (null = no max)
}

export type YieldMechanics = {
  type: YieldMechanicType
  requiresValidatorSelection: boolean  // If true, validators endpoint should be called
  rewardSchedule: string     // e.g., "continuous", "daily", "epoch-based"
  rewardClaiming: string     // e.g., "auto-compound", "manual-claim"
  gasFeeToken: YieldToken    // Token used for gas fees on this yield
  entryLimits: YieldEntryLimits
  arguments: YieldArguments  // Schema for enter/exit forms
}

// ============================================================================
// Yield Metadata Types
// ============================================================================

export type YieldMetadata = {
  name: string               // Display name (e.g., "Aave V3 USDC Lending")
  description: string        // Description of the yield opportunity
  logoURI: string            // Provider/yield logo
  documentation?: string     // Link to docs
  underMaintenance: boolean  // If true, yield is temporarily unavailable
  deprecated: boolean        // If true, users should exit
}

export type YieldStatistics = {
  tvlUsd: string             // Total value locked in USD
  tvl: string                // Total value locked in base token
}

export type YieldStatus = {
  enter: boolean             // Can users enter this yield?
  exit: boolean              // Can users exit this yield?
}

// ============================================================================
// Main Yield DTO
// ============================================================================

export type YieldDto = {
  id: string                 // Unique yield ID (e.g., "base-usdc-aave-v3-lending")
  network: string            // Network ID (e.g., "base")
  chainId: string            // Numeric chain ID as string (e.g., "8453" for Base)
  providerId: string         // Provider ID (e.g., "aave-v3", "morpho")
  
  // Tokens
  token: YieldToken          // Primary input token
  inputTokens: YieldToken[]  // All accepted input tokens
  outputToken: YieldToken    // Token received (e.g., aBasUSDC for Aave)
  
  // Rates & Stats
  rewardRate: YieldRewardRate
  statistics: YieldStatistics
  
  // Status & Metadata
  status: YieldStatus
  metadata: YieldMetadata
  mechanics: YieldMechanics
  
  // Classification
  tags: string[]             // e.g., ["lending", "stablecoin", "audited"]
}

// ============================================================================
// Paginated Response Types
// ============================================================================

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  offset: number
  limit: number
}

export type YieldsResponse = PaginatedResponse<YieldDto>

// ============================================================================
// Balance Types
// ============================================================================

export enum YieldBalanceType {
  Active = 'active',         // Currently earning yield
  Entering = 'entering',     // Deposit in progress
  Exiting = 'exiting',       // Unstaking/cooldown period
  Withdrawable = 'withdrawable',  // Ready to withdraw
  Claimable = 'claimable',   // Rewards ready to claim
  Locked = 'locked',         // Vesting/restricted
}

export type PendingAction = {
  type: string               // e.g., "CLAIM_REWARDS", "WITHDRAW", "EXIT"
  passthrough: string        // Opaque token - MUST include when calling /actions/manage
  arguments?: YieldArgumentField[]  // Optional schema for action-specific args
}

export type YieldBalance = {
  address: string            // Wallet address
  amount: string             // Human-readable amount
  amountRaw: string          // Amount in base units (wei, etc.)
  amountUsd: string          // USD value
  type: YieldBalanceType
  token: YieldToken          // The balance token (e.g., aBasUSDC for Aave position)
  isEarning: boolean         // Whether actively earning yield
  pendingActions: PendingAction[]
}

export type YieldBalancesResponse = {
  yieldId: string
  balances: YieldBalance[]
}

export type AggregateBalancesQuery = {
  address: string
  network: string
  yieldId?: string           // Optional: omit to scan all yields on network
}

export type AggregateBalancesResponse = {
  items: YieldBalancesResponse[]
  errors: Array<{ query: AggregateBalancesQuery; error: string }>
}

// ============================================================================
// Transaction Types
// ============================================================================

// Full enum from API docs
export enum TransactionStatus {
  NotFound = 'NOT_FOUND',
  Created = 'CREATED',
  Blocked = 'BLOCKED',
  WaitingForSignature = 'WAITING_FOR_SIGNATURE',
  Signed = 'SIGNED',
  Broadcasted = 'BROADCASTED',
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Failed = 'FAILED',
  Skipped = 'SKIPPED',
}

// Full enum from API docs - all possible transaction operation types
export enum TransactionType {
  // Core operations
  Swap = 'SWAP',
  Deposit = 'DEPOSIT',
  Approval = 'APPROVAL',
  Stake = 'STAKE',
  ClaimUnstaked = 'CLAIM_UNSTAKED',
  ClaimRewards = 'CLAIM_REWARDS',
  RestakeRewards = 'RESTAKE_REWARDS',
  Unstake = 'UNSTAKE',
  Split = 'SPLIT',
  Merge = 'MERGE',
  Lock = 'LOCK',
  Unlock = 'UNLOCK',
  Supply = 'SUPPLY',
  AddLiquidity = 'ADD_LIQUIDITY',
  RemoveLiquidity = 'REMOVE_LIQUIDITY',
  Bridge = 'BRIDGE',
  Vote = 'VOTE',
  Revoke = 'REVOKE',
  Restake = 'RESTAKE',
  Rebond = 'REBOND',
  Withdraw = 'WITHDRAW',
  WithdrawAll = 'WITHDRAW_ALL',
  CreateAccount = 'CREATE_ACCOUNT',
  Reveal = 'REVEAL',
  Migrate = 'MIGRATE',
  Delegate = 'DELEGATE',
  Undelegate = 'UNDELEGATE',
  // Avalanche
  UtxoPToCImport = 'UTXO_P_TO_C_IMPORT',
  UtxoCToPImport = 'UTXO_C_TO_P_IMPORT',
  // Wrapping
  Wrap = 'WRAP',
  Unwrap = 'UNWRAP',
  // Tron legacy
  UnfreezeLegacy = 'UNFREEZE_LEGACY',
  UnfreezeLegacyBandwidth = 'UNFREEZE_LEGACY_BANDWIDTH',
  UnfreezeLegacyEnergy = 'UNFREEZE_LEGACY_ENERGY',
  UnfreezeBandwidth = 'UNFREEZE_BANDWIDTH',
  UnfreezeEnergy = 'UNFREEZE_ENERGY',
  FreezeBandwidth = 'FREEZE_BANDWIDTH',
  FreezeEnergy = 'FREEZE_ENERGY',
  UndelegateBandwidth = 'UNDELEGATE_BANDWIDTH',
  UndelegateEnergy = 'UNDELEGATE_ENERGY',
  // P2P
  P2pNodeRequest = 'P2P_NODE_REQUEST',
  // EigenLayer
  CreateEigenpod = 'CREATE_EIGENPOD',
  VerifyWithdrawCredentials = 'VERIFY_WITHDRAW_CREDENTIALS',
  StartCheckpoint = 'START_CHECKPOINT',
  VerifyCheckpointProofs = 'VERIFY_CHECKPOINT_PROOFS',
  QueueWithdrawals = 'QUEUE_WITHDRAWALS',
  CompleteQueuedWithdrawals = 'COMPLETE_QUEUED_WITHDRAWALS',
  // LayerZero
  LzDeposit = 'LZ_DEPOSIT',
  LzWithdraw = 'LZ_WITHDRAW',
  // Provider-specific
  LuganodesProvision = 'LUGANODES_PROVISION',
  LuganodesExitRequest = 'LUGANODES_EXIT_REQUEST',
  InfstonesProvision = 'INFSTONES_PROVISION',
  InfstonesExitRequest = 'INFSTONES_EXIT_REQUEST',
  InfstonesClaimRequest = 'INFSTONES_CLAIM_REQUEST',
}

// All supported networks from API
export enum YieldNetwork {
  // EVM Mainnets
  Ethereum = 'ethereum',
  Arbitrum = 'arbitrum',
  Base = 'base',
  Gnosis = 'gnosis',
  Optimism = 'optimism',
  Polygon = 'polygon',
  Starknet = 'starknet',
  Zksync = 'zksync',
  Linea = 'linea',
  Unichain = 'unichain',
  Monad = 'monad',
  AvalancheC = 'avalanche-c',
  AvalancheCAttomic = 'avalanche-c-atomic',
  AvalancheP = 'avalanche-p',
  Binance = 'binance',
  Celo = 'celo',
  Fantom = 'fantom',
  Harmony = 'harmony',
  Moonriver = 'moonriver',
  Okc = 'okc',
  Viction = 'viction',
  Core = 'core',
  Sonic = 'sonic',
  Plasma = 'plasma',
  Katana = 'katana',
  Hyperevm = 'hyperevm',
  // EVM Testnets
  EthereumGoerli = 'ethereum-goerli',
  EthereumHolesky = 'ethereum-holesky',
  EthereumSepolia = 'ethereum-sepolia',
  EthereumHoodi = 'ethereum-hoodi',
  BaseSepolia = 'base-sepolia',
  PolygonAmoy = 'polygon-amoy',
  MonadTestnet = 'monad-testnet',
  // Cosmos ecosystem
  Agoric = 'agoric',
  Akash = 'akash',
  Axelar = 'axelar',
  BandProtocol = 'band-protocol',
  Bitsong = 'bitsong',
  Canto = 'canto',
  Chihuahua = 'chihuahua',
  Comdex = 'comdex',
  Coreum = 'coreum',
  Cosmos = 'cosmos',
  Crescent = 'crescent',
  Cronos = 'cronos',
  Cudos = 'cudos',
  Desmos = 'desmos',
  Dydx = 'dydx',
  Evmos = 'evmos',
  FetchAi = 'fetch-ai',
  GravityBridge = 'gravity-bridge',
  Injective = 'injective',
  Irisnet = 'irisnet',
  Juno = 'juno',
  Kava = 'kava',
  KiNetwork = 'ki-network',
  MarsProtocol = 'mars-protocol',
  Nym = 'nym',
  OkexChain = 'okex-chain',
  Onomy = 'onomy',
  Osmosis = 'osmosis',
  Persistence = 'persistence',
  Quicksilver = 'quicksilver',
  Regen = 'regen',
  Secret = 'secret',
  Sentinel = 'sentinel',
  Sommelier = 'sommelier',
  Stafi = 'stafi',
  Stargaze = 'stargaze',
  Stride = 'stride',
  Teritori = 'teritori',
  Tgrade = 'tgrade',
  Umee = 'umee',
  Sei = 'sei',
  Mantra = 'mantra',
  Celestia = 'celestia',
  Saga = 'saga',
  Zetachain = 'zetachain',
  Dymension = 'dymension',
  Humansai = 'humansai',
  Neutron = 'neutron',
  // Other chains
  Polkadot = 'polkadot',
  Kusama = 'kusama',
  Westend = 'westend',
  Bittensor = 'bittensor',
  BinanceBeacon = 'binancebeacon',
  Cardano = 'cardano',
  Near = 'near',
  Solana = 'solana',
  SolanaDevnet = 'solana-devnet',
  Stellar = 'stellar',
  StellarTestnet = 'stellar-testnet',
  Sui = 'sui',
  Tezos = 'tezos',
  Tron = 'tron',
  Ton = 'ton',
  TonTestnet = 'ton-testnet',
  Hyperliquid = 'hyperliquid',
}

export type GasEstimate = {
  token: YieldToken          // Gas token info
  amount: string             // Gas cost in native token (human-readable)
  gasLimit: string           // Gas limit
  gasPrice?: string          // For legacy txs
  maxFeePerGas?: string      // For EIP-1559 txs
  maxPriorityFeePerGas?: string
}

export type AnnotatedTransaction = {
  method: string             // e.g., "approve", "deposit"
  params: Record<string, unknown>  // Decoded params for display
}

export type StructuredTransaction = {
  // Detailed transaction data for client-side validation/simulation
  [key: string]: unknown
}

export type TransactionDto = {
  id: string                 // Transaction ID (for submit endpoints)
  title: string              // e.g., "APPROVAL Transaction", "STAKE Transaction"
  network: YieldNetwork | string  // Network ID
  status: TransactionStatus
  type: TransactionType
  hash: string | null        // Tx hash (populated after broadcast)
  createdAt: string          // ISO timestamp
  broadcastedAt: string | null
  signedTransaction: string | null  // Signed tx data (ready for broadcast)
  unsignedTransaction: string | object  // JSON STRING or object - parse if string!
  annotatedTransaction?: AnnotatedTransaction | null  // Human-readable breakdown
  structuredTransaction?: StructuredTransaction | null  // For validation/simulation
  stepIndex: number          // Zero-based index in action flow (0, 1, 2...)
  description?: string       // User-friendly description
  error?: string | null      // Error message if failed
  gasEstimate: string        // JSON STRING of GasEstimate - must be parsed!
  explorerUrl?: string | null  // Link to block explorer
  isMessage?: boolean        // True if this is a message, not value transfer
}

// Parsed version of unsignedTransaction JSON string
export type ParsedUnsignedTransaction = {
  from: string               // Sender address
  to: string                 // Contract address
  data: string               // Calldata (hex)
  value?: string             // Native token value (hex, e.g., "0x0")
  nonce: number              // Transaction nonce
  type: number               // EIP-2718 tx type (2 = EIP-1559)
  gasLimit: string           // Hex string
  maxFeePerGas: string       // Hex string (EIP-1559)
  maxPriorityFeePerGas: string  // Hex string (EIP-1559)
  chainId: number            // Numeric chain ID
}

// ============================================================================
// Action Types
// ============================================================================

export enum ActionIntent {
  Enter = 'enter',
  Exit = 'exit',
  Manage = 'manage',
}

// Full enum from API docs
export enum ActionStatus {
  Canceled = 'CANCELED',
  Created = 'CREATED',
  WaitingForNext = 'WAITING_FOR_NEXT',
  Processing = 'PROCESSING',
  Failed = 'FAILED',
  Success = 'SUCCESS',
  Stale = 'STALE',
}

// Full enum from API docs - specific action types
export enum ActionType {
  Stake = 'STAKE',
  Unstake = 'UNSTAKE',
  ClaimRewards = 'CLAIM_REWARDS',
  RestakeRewards = 'RESTAKE_REWARDS',
  Withdraw = 'WITHDRAW',
  WithdrawAll = 'WITHDRAW_ALL',
  Restake = 'RESTAKE',
  ClaimUnstaked = 'CLAIM_UNSTAKED',
  UnlockLocked = 'UNLOCK_LOCKED',
  StakeLocked = 'STAKE_LOCKED',
  Vote = 'VOTE',
  Revoke = 'REVOKE',
  VoteLocked = 'VOTE_LOCKED',
  Revote = 'REVOTE',
  Rebond = 'REBOND',
  Migrate = 'MIGRATE',
  VerifyWithdrawCredentials = 'VERIFY_WITHDRAW_CREDENTIALS',
  Delegate = 'DELEGATE',
}

export enum ExecutionPattern {
  Synchronous = 'synchronous',   // Submit one by one, wait for each
  Asynchronous = 'asynchronous', // Submit all at once
  Batch = 'batch',               // Single transaction with multiple operations
}

export type ActionDto = {
  id: string                 // Action ID
  intent: ActionIntent       // What the user intended to do
  type: ActionType | string  // Protocol-specific type (e.g., "STAKE", "LEND")
  yieldId: string
  address: string            // User's wallet address
  amount: string | null      // Human-readable amount
  amountRaw: string | null   // Base units
  amountUsd: string | null   // USD value
  transactions: TransactionDto[]  // Transactions to sign (may be 1+, e.g., approve + deposit)
  executionPattern: ExecutionPattern  // How to execute transactions
  rawArguments: Record<string, unknown> | null  // Original arguments submitted
  status: ActionStatus
  createdAt: string          // ISO timestamp
  completedAt: string | null
}

export type ActionsResponse = PaginatedResponse<ActionDto>

// ============================================================================
// Request/Response Types for API Client
// ============================================================================

// GET /v1/yields
export type GetYieldsParams = {
  network?: string
  provider?: string
  limit?: number
  offset?: number
}

// POST /v1/actions/enter
export type EnterYieldRequest = {
  yieldId: string
  address: string
  arguments: {
    amount: string           // Human-readable amount (e.g., "10" for 10 USDC)
    validatorAddress?: string  // For validator-based yields
    receiverAddress?: string   // For ERC4626 vaults
    feeConfigurationId?: string
  }
}

// POST /v1/actions/exit
export type ExitYieldRequest = {
  yieldId: string
  address: string
  arguments: {
    amount?: string          // Amount to withdraw
    useMaxAmount?: boolean   // Withdraw all
  }
}

// POST /v1/actions/manage
export type ManageYieldRequest = {
  yieldId: string
  address: string
  action: string             // e.g., "CLAIM_REWARDS", "RESTAKE_REWARDS"
  passthrough: string        // REQUIRED - from pendingActions
  arguments?: Record<string, unknown>
}

// POST /v1/transactions/{id}/submit
export type SubmitTransactionRequest = {
  signedTransaction: string  // Hex-encoded signed transaction
}

// PUT /v1/transactions/{id}/submit-hash
export type SubmitTransactionHashRequest = {
  hash: string               // Transaction hash from blockchain
}

// POST /v1/yields/{yieldId}/balances
export type GetYieldBalancesRequest = {
  address: string
  arguments?: Record<string, unknown>
}

// POST /v1/yields/balances
export type GetAggregateBalancesRequest = {
  queries: AggregateBalancesQuery[]
}

// ============================================================================
// Network Types
// ============================================================================

export type NetworkDto = {
  id: string                 // e.g., "base", "ethereum"
  name: string               // e.g., "Base", "Ethereum"
  category: string           // e.g., "evm", "cosmos", "solana"
  logoURI: string
  chainId?: number           // Numeric chain ID for EVM networks
}

// ============================================================================
// Utility Types
// ============================================================================

// Helper to parse JSON string fields from API
export const parseUnsignedTransaction = (jsonString: string): ParsedUnsignedTransaction => {
  return JSON.parse(jsonString)
}

export const parseGasEstimate = (jsonString: string): GasEstimate => {
  return JSON.parse(jsonString)
}

// Type guard for checking if a balance allows exit
export const isExitableBalance = (balance: YieldBalance): boolean => {
  return balance.type === YieldBalanceType.Active || 
         balance.type === YieldBalanceType.Withdrawable
}

// Type guard for checking if balance is earning
export const isEarningBalance = (balance: YieldBalance): boolean => {
  return balance.isEarning && balance.type === YieldBalanceType.Active
}
```

### 1.0.1 Network/ChainId Mapping Utilities

Create `src/lib/yieldxyz/constants.ts` for network mapping (following Portals pattern):

```typescript
import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  cosmosChainId,
  osmosisChainId,
  solanaChainId,
  // Add more as needed
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

import { YieldNetwork } from './types'

/**
 * Maps ShapeShift ChainId (CAIP-2 format like "eip155:8453") to Yield.xyz network identifier.
 * 
 * NOTE: Only includes networks we actively support. Yield.xyz supports 80+ networks,
 * but we only map the ones ShapeShift has chain adapters for.
 */
export const CHAIN_ID_TO_YIELD_NETWORK: Partial<Record<ChainId, YieldNetwork>> = {
  // EVM Networks (eip155:X format)
  [ethChainId]: YieldNetwork.Ethereum,           // eip155:1
  [arbitrumChainId]: YieldNetwork.Arbitrum,      // eip155:42161
  [baseChainId]: YieldNetwork.Base,              // eip155:8453
  [optimismChainId]: YieldNetwork.Optimism,      // eip155:10
  [polygonChainId]: YieldNetwork.Polygon,        // eip155:137
  [bscChainId]: YieldNetwork.Binance,            // eip155:56
  [avalancheChainId]: YieldNetwork.AvalancheC,   // eip155:43114
  [gnosisChainId]: YieldNetwork.Gnosis,          // eip155:100
  // Cosmos Networks (cosmos:X format)
  [cosmosChainId]: YieldNetwork.Cosmos,          // cosmos:cosmoshub-4
  [osmosisChainId]: YieldNetwork.Osmosis,        // cosmos:osmosis-1
  // Other Networks
  [solanaChainId]: YieldNetwork.Solana,          // solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
}

/**
 * Inverse mapping: Yield.xyz network identifier to ShapeShift ChainId (CAIP-2).
 */
export const YIELD_NETWORK_TO_CHAIN_ID: Partial<Record<YieldNetwork, ChainId>> = invert(
  CHAIN_ID_TO_YIELD_NETWORK,
) as Partial<Record<YieldNetwork, ChainId>>

/**
 * Networks supported by both ShapeShift and Yield.xyz.
 * Use this to filter yield opportunities to chains we can actually sign for.
 */
export const SUPPORTED_YIELD_NETWORKS = Object.values(CHAIN_ID_TO_YIELD_NETWORK)

/**
 * Check if a Yield.xyz network is supported by ShapeShift.
 */
export const isSupportedYieldNetwork = (network: string): network is YieldNetwork => {
  return Object.values(CHAIN_ID_TO_YIELD_NETWORK).includes(network as YieldNetwork)
}
```

Create `src/lib/yieldxyz/utils.ts` for conversion utilities:

```typescript
import type { ChainId } from '@shapeshiftoss/caip'

import { 
  CHAIN_ID_TO_YIELD_NETWORK, 
  YIELD_NETWORK_TO_CHAIN_ID,
  isSupportedYieldNetwork 
} from './constants'
import type { YieldNetwork, YieldDto, TransactionDto, ParsedUnsignedTransaction, GasEstimate } from './types'

/**
 * Convert ShapeShift ChainId (CAIP-2 like "eip155:8453") to Yield.xyz network identifier.
 * Returns undefined if chain is not supported.
 * 
 * @example
 * chainIdToYieldNetwork('eip155:8453') // => 'base'
 * chainIdToYieldNetwork('eip155:1')    // => 'ethereum'
 */
export const chainIdToYieldNetwork = (chainId: ChainId): YieldNetwork | undefined => {
  return CHAIN_ID_TO_YIELD_NETWORK[chainId]
}

/**
 * Convert Yield.xyz network identifier to ShapeShift ChainId (CAIP-2).
 * Returns undefined if network is not supported by ShapeShift.
 * 
 * @example
 * yieldNetworkToChainId('base')     // => 'eip155:8453'
 * yieldNetworkToChainId('ethereum') // => 'eip155:1'
 */
export const yieldNetworkToChainId = (network: string): ChainId | undefined => {
  if (!isSupportedYieldNetwork(network)) return undefined
  return YIELD_NETWORK_TO_CHAIN_ID[network]
}

/**
 * Assert conversion - throws if chain not supported.
 */
export const assertYieldNetworkToChainId = (network: string): ChainId => {
  const chainId = yieldNetworkToChainId(network)
  if (!chainId) {
    throw new Error(`Yield.xyz network "${network}" is not supported by ShapeShift`)
  }
  return chainId
}

/**
 * Assert conversion - throws if network not supported.
 */
export const assertChainIdToYieldNetwork = (chainId: ChainId): YieldNetwork => {
  const network = chainIdToYieldNetwork(chainId)
  if (!network) {
    throw new Error(`ChainId "${chainId}" is not supported by Yield.xyz integration`)
  }
  return network
}

/**
 * Filter yields to only those on chains ShapeShift supports.
 */
export const filterSupportedYields = (yields: YieldDto[]): YieldDto[] => {
  return yields.filter(y => isSupportedYieldNetwork(y.network))
}

/**
 * Parse the unsignedTransaction JSON string from API response.
 * Handles both string (needs parsing) and object (already parsed) cases.
 */
export const parseUnsignedTx = (tx: TransactionDto): ParsedUnsignedTransaction => {
  if (typeof tx.unsignedTransaction === 'string') {
    return JSON.parse(tx.unsignedTransaction)
  }
  return tx.unsignedTransaction as unknown as ParsedUnsignedTransaction
}

/**
 * Parse the gasEstimate JSON string from API response.
 */
export const parseGasEstimate = (tx: TransactionDto): GasEstimate => {
  if (typeof tx.gasEstimate === 'string') {
    return JSON.parse(tx.gasEstimate)
  }
  return tx.gasEstimate as unknown as GasEstimate
}
```

### 1.1 Environment Variables

Add to `.env`, `.env.development`, `.env.production`:

```env
VITE_YIELD_XYZ_API_KEY=
VITE_YIELD_XYZ_BASE_URL=https://api.yield.xyz
```

Add to `src/config.ts`:
```typescript
VITE_YIELD_XYZ_API_KEY: str({ default: '' }),
VITE_YIELD_XYZ_BASE_URL: str({ default: 'https://api.yield.xyz' }),
```

### 1.2 Feature Flag

Add `YieldXyz` feature flag:

1. Add to `FeatureFlags` type in `src/state/slices/preferencesSlice/preferencesSlice.ts`
2. Add env var `VITE_FEATURE_YIELD_XYZ: bool({ default: false })` in `src/config.ts`
3. Add to initial state in preferencesSlice
4. Add to test mock in `src/test/mocks/store.ts`

### 1.3 CSP Updates

Whitelist in CSP config:
- `api.yield.xyz` - API endpoint
- `assets.stakek.it` - Token/provider logos (verify this is correct, not hallucinated)

### 1.4 API Client

Create `src/lib/yieldxyz/api.ts`:

```typescript
import axios from 'axios'
import { getConfig } from '@/config'

const yieldxyzApi = axios.create({
  baseURL: getConfig().VITE_YIELD_XYZ_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': getConfig().VITE_YIELD_XYZ_API_KEY,
  },
})

export const yieldxyzClient = {
  // Discovery
  getYields: (params?: { network?: string; limit?: number; offset?: number }) => 
    yieldxyzApi.get('/v1/yields', { params }),
  
  getYield: (yieldId: string) => 
    yieldxyzApi.get(`/v1/yields/${yieldId}`),
  
  getNetworks: () => 
    yieldxyzApi.get('/v1/networks'),

  // Balances
  getYieldBalances: (yieldId: string, address: string) =>
    yieldxyzApi.post(`/v1/yields/${yieldId}/balances`, { address }),
  
  getAggregateBalances: (queries: Array<{ address: string; network: string; yieldId?: string }>) =>
    yieldxyzApi.post('/v1/yields/balances', { queries }),

  // Actions
  enterYield: (data: { yieldId: string; address: string; arguments: { amount: string } }) =>
    yieldxyzApi.post('/v1/actions/enter', data),
  
  exitYield: (data: { yieldId: string; address: string; arguments: { amount?: string; useMaxAmount?: boolean } }) =>
    yieldxyzApi.post('/v1/actions/exit', data),

  // Transactions (two options - we use Option B for better app integration)
  // Option A: Let Yield.xyz broadcast
  submitTransaction: (transactionId: string, signedTransaction: string) =>
    yieldxyzApi.post(`/v1/transactions/${transactionId}/submit`, { signedTransaction }),
  
  // Option B: Self-broadcast, then submit hash for tracking (PREFERRED)
  submitTransactionHash: (transactionId: string, hash: string) =>
    yieldxyzApi.put(`/v1/transactions/${transactionId}/submit-hash`, { hash }),
  
  getTransaction: (transactionId: string) =>
    yieldxyzApi.get(`/v1/transactions/${transactionId}`),
  
  getAction: (actionId: string) =>
    yieldxyzApi.get(`/v1/actions/${actionId}`),
}
```

### 1.5 Types

Create `src/lib/yieldxyz/types.ts` with types derived from API responses:

```typescript
export type YieldToken = {
  address?: string
  symbol: string
  name: string
  decimals: number
  network: string
  logoURI: string
  coinGeckoId?: string
  isPoints?: boolean
}

export type YieldRewardRate = {
  total: number
  rateType: 'APY' | 'APR'
  components: Array<{
    rate: number
    rateType: string
    token: YieldToken
    yieldSource: string
    description: string
  }>
}

export type YieldMechanics = {
  type: 'vault' | 'lending' | 'staking' | 'restaking' | 'liquid-staking'
  requiresValidatorSelection: boolean
  rewardSchedule: string
  rewardClaiming: string
  gasFeeToken: YieldToken
  entryLimits: { minimum: string; maximum: string | null }
  arguments: {
    enter: { fields: YieldArgumentField[] }
    exit: { fields: YieldArgumentField[] }
  }
}

export type YieldArgumentField = {
  name: string
  type: string
  label: string
  description: string
  required: boolean
  placeholder?: string
  minimum?: string
  maximum?: string | null
  isArray: boolean
  options?: string[]
  optionsRef?: string
}

export type YieldDto = {
  id: string
  network: string
  inputTokens: YieldToken[]
  token: YieldToken
  outputToken: YieldToken
  rewardRate: YieldRewardRate
  status: { enter: boolean; exit: boolean }
  metadata: {
    name: string
    description: string
    logoURI: string
    documentation?: string
    underMaintenance: boolean
    deprecated: boolean
  }
  mechanics: YieldMechanics
  providerId: string
  chainId: string
  tags: string[]
  statistics: {
    tvlUsd: string
    tvl: string
  }
}

export type YieldBalanceType = 'active' | 'entering' | 'exiting' | 'withdrawable' | 'claimable' | 'locked'

export type YieldBalance = {
  address: string
  amount: string
  amountRaw: string
  amountUsd: string
  type: YieldBalanceType
  token: YieldToken
  isEarning: boolean
  pendingActions: Array<{
    type: string
    passthrough: string
    arguments?: Record<string, unknown>
  }>
}

export type YieldBalancesResponse = {
  yieldId: string
  balances: YieldBalance[]
}

export type TransactionDto = {
  id: string
  title: string
  network: string
  status: 'CREATED' | 'PENDING' | 'BROADCASTED' | 'CONFIRMED' | 'FAILED'
  type: 'APPROVAL' | 'SUPPLY' | 'STAKE' | 'UNSTAKE' | 'WITHDRAW'
  hash: string | null
  unsignedTransaction: string // JSON string - needs parsing
  stepIndex: number
  gasEstimate: string // JSON string - needs parsing
}

export type ActionDto = {
  id: string
  intent: 'enter' | 'exit' | 'manage'
  type: string
  yieldId: string
  address: string
  amount: string
  amountRaw: string
  amountUsd: string
  transactions: TransactionDto[]
  status: 'CREATED' | 'PENDING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  completedAt: string | null
}

// Parsed unsigned transaction (from JSON string)
export type ParsedUnsignedTransaction = {
  from: string
  to: string
  data: string
  value?: string
  nonce: number
  type: number
  gasLimit: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  chainId: number
}
```

---

## Phase 2: React Query Hooks

Create `src/react-queries/yieldxyz/` directory with simple hooks:

### 2.1 useYields.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { yieldxyzClient } from '@/lib/yieldxyz/api'

export const useYields = (network?: string) => {
  return useQuery({
    queryKey: ['yieldxyz', 'yields', network],
    queryFn: async () => {
      const { data } = await yieldxyzClient.getYields({ network, limit: 50 })
      return data
    },
    staleTime: 60_000,
  })
}
```

### 2.2 useYield.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { yieldxyzClient } from '@/lib/yieldxyz/api'

export const useYield = (yieldId: string | undefined) => {
  return useQuery({
    queryKey: ['yieldxyz', 'yield', yieldId],
    queryFn: async () => {
      if (!yieldId) throw new Error('yieldId required')
      const { data } = await yieldxyzClient.getYield(yieldId)
      return data
    },
    enabled: !!yieldId,
    staleTime: 60_000,
  })
}
```

### 2.3 useYieldBalances.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { yieldxyzClient } from '@/lib/yieldxyz/api'

export const useYieldBalances = (yieldId: string | undefined, address: string | undefined) => {
  return useQuery({
    queryKey: ['yieldxyz', 'balances', yieldId, address],
    queryFn: async () => {
      if (!yieldId || !address) throw new Error('yieldId and address required')
      const { data } = await yieldxyzClient.getYieldBalances(yieldId, address)
      return data
    },
    enabled: !!yieldId && !!address,
    staleTime: 30_000,
  })
}
```

### 2.4 useEnterYield.ts

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { yieldxyzClient } from '@/lib/yieldxyz/api'

export const useEnterYield = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { yieldId: string; address: string; arguments: { amount: string } }) =>
      yieldxyzClient.enterYield(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances', variables.yieldId] })
    },
  })
}
```

### 2.5 useExitYield.ts

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { yieldxyzClient } from '@/lib/yieldxyz/api'

export const useExitYield = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { yieldId: string; address: string; arguments: { amount?: string; useMaxAmount?: boolean } }) =>
      yieldxyzClient.exitYield(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances', variables.yieldId] })
    },
  })
}
```

### 2.6 useSubmitYieldTransaction.ts

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { yieldxyzClient } from '@/lib/yieldxyz/api'

export const useSubmitYieldTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ transactionId, signedTransaction }: { transactionId: string; signedTransaction: string }) =>
      yieldxyzClient.submitTransaction(transactionId, signedTransaction),
    onSuccess: () => {
      // Invalidate all balances after successful tx
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances'] })
    },
  })
}
```

---

## Phase 3: Transaction Signing

### 3.1 Transaction Utilities

Create `src/lib/yieldxyz/transaction.ts`:

```typescript
import type { ParsedUnsignedTransaction, TransactionDto } from './types'

/**
 * Parse the JSON string unsignedTransaction from Yield.xyz API
 * 
 * NOTE: Check for hex vs non-hex values - this has bitten us before.
 * Look at existing patterns in codebase for normalizing hex values.
 */
export const parseUnsignedTransaction = (tx: TransactionDto): ParsedUnsignedTransaction => {
  return JSON.parse(tx.unsignedTransaction)
}

/**
 * Convert parsed tx to format expected by chain adapter signTransaction
 */
export const toChainAdapterTx = (parsed: ParsedUnsignedTransaction) => {
  // TODO: Verify hex normalization - check existing patterns in:
  // - src/lib/utils/evm/index.ts
  // - src/plugins/walletConnectToDapps/utils/EIP155RequestHandlerUtil.ts
  return {
    to: parsed.to,
    from: parsed.from,
    data: parsed.data,
    value: parsed.value ?? '0x0',
    gasLimit: parsed.gasLimit,
    maxFeePerGas: parsed.maxFeePerGas,
    maxPriorityFeePerGas: parsed.maxPriorityFeePerGas,
    nonce: String(parsed.nonce),
    chainId: parsed.chainId,
  }
}
```

### 3.2 Signing & Broadcasting Flow

**We self-broadcast** (Option B) for better integration with our app patterns (tx history, action center).

```typescript
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { baseChainId } from '@shapeshiftoss/caip'

// Get adapter
const chainAdapterManager = getChainAdapterManager()
const adapter = chainAdapterManager.get(baseChainId)

// Sign
const signedTx = await adapter.signTransaction({ txToSign, wallet })

// Broadcast ourselves (integrates with our tx history)
const txHash = await adapter.broadcastTransaction({
  senderAddress,
  receiverAddress,
  hex: signedTx,
})

// Notify Yield.xyz for their tracking (optional but good practice)
await yieldxyzClient.submitTransactionHash(tx.id, txHash)
```

**Why self-broadcast?**
- Integrates with our existing tx history system
- Works with action center notifications
- Full control over RPC endpoints
- Consistent UX with rest of app

---

## Phase 4: Pages & Routing

### 4.1 Routes

Add to router config (feature-flagged):

```typescript
// /yields - List page
// /yields/:yieldId - Detail page
```

### 4.2 Nav Item

Add "Yields" under "Earn" dropdown (feature-flagged with `YieldXyz` flag).

### 4.3 File Structure

```
src/pages/Yields/
  Yields.tsx                     # List page - grid of YieldCards
  Yield.tsx                      # Detail page - metadata + Enter/Exit widget
  components/
    YieldCard.tsx                # Card for list view
    YieldEnterExit.tsx           # Reusable Enter/Exit widget
    YieldStats.tsx               # Metadata display (left side)
    YieldYourInfo.tsx            # User's position info (right side)
    YieldTransactionSteps.tsx    # Multi-step tx UI (1. Approve, 2. Enter)
```

---

## Phase 5: Components

### 5.1 Yields.tsx (List Page)

Layout:
- Account selector at top (BASE chainId accounts only, disabled for POC - account 0 selected)
- Grid of YieldCards
- Loading: skeleton cards
- Empty: "No yields available"

### 5.2 Yield.tsx (Detail Page)

Two-column layout:
- **Left**: YieldStats (name, provider, description, APY, TVL, type)
- **Right**: 
  - YieldYourInfo (wallet balance of input token, active position balance)
  - YieldEnterExit widget

### 5.3 YieldCard.tsx

Display:
- Provider logo (from `metadata.logoURI` or token logo)
- Yield name (`metadata.name`)
- Provider name (`providerId`)
- Input token symbol
- APY (`rewardRate.total` formatted as %)
- TVL (`statistics.tvlUsd`)
- User's active balance (if any)

Click → navigate to `/yields/:yieldId`

### 5.4 YieldEnterExit.tsx (Reusable Widget)

Tabs: **Enter** | **Exit**

**Enter Tab:**
- Amount input with token icon
- MAX button (uses wallet balance)
- Shows: "You will receive" with output token
- Shows: APY
- Enter button

**Exit Tab:**
- Amount input with output token icon
- MAX button (uses active position balance)
- Shows: "You will receive" with input token
- Exit button

**On Submit:**
1. Call `enterYield` / `exitYield` mutation
2. Get back `ActionDto` with `transactions[]`
3. Show `YieldTransactionSteps` UI
4. Process each step sequentially

### 5.5 YieldTransactionSteps.tsx

Multi-step transaction UI (like Spark):

```
Actions
┌─────────────────────────────────────┐
│ 1  ↗  Approve USDC        [Approve] │
├─────────────────────────────────────┤
│ 2  ⇄  Enter USDC          [Enter]   │
└─────────────────────────────────────┘
```

States per step:
- Pending (gray, waiting)
- Active (blue, ready to sign)
- Signing (spinner)
- Confirming (spinner, waiting for tx)
- Complete (green checkmark)

Flow:
1. User clicks step button
2. Parse `unsignedTransaction` JSON
3. Sign with chain adapter
4. Submit to Yield.xyz via `POST /v1/transactions/{id}/submit`
5. Mark step complete, activate next step
6. On all complete: invalidate queries, show success

### 5.6 YieldYourInfo.tsx

Right sidebar card showing:
- Wallet balance of input token (e.g., "8.67 USDC")
- Active position balance (e.g., "0 aBasUSDC")
- Position value in USD

---

## Phase 6: Translations

Add to `src/assets/translations/en/main.json`:

```json
{
  "yields": {
    "title": "Yields",
    "enter": "Enter",
    "exit": "Exit",
    "enterAmount": "Amount to enter",
    "exitAmount": "Amount to exit",
    "youWillReceive": "You will receive",
    "apy": "APY",
    "tvl": "TVL",
    "provider": "Provider",
    "type": "Type",
    "yourInfo": "Your Info",
    "walletBalance": "Wallet balance",
    "activeBalance": "Active balance",
    "availableToEnter": "Available to enter",
    "approve": "Approve",
    "approving": "Approving...",
    "entering": "Entering...",
    "exiting": "Exiting...",
    "transactionSteps": "Actions",
    "noYields": "No yields available",
    "connectWallet": "Connect Wallet"
  }
}
```

---

## Phase 7 (Stretch): Action Center Integration

Integrate yield enter/exit transactions with the action center:
- Show pending yield transactions in action center
- Track transaction status
- Show success/failure notifications

This leverages our self-broadcast approach which already integrates with tx history.

---

## Phase 8 (Stretch): Asset Page Integration

Add "Available Yields" section to asset detail page showing YieldCards for yields that match the asset.

This is a stretch goal - only if time permits after core POC is working.

---

## Implementation Notes

### Hex Normalization
> ⚠️ **LLM Note**: When implementing transaction signing, check existing patterns for hex value normalization. This has caused issues before. Look at:
> - `src/lib/utils/evm/index.ts`
> - `src/plugins/walletConnectToDapps/utils/EIP155RequestHandlerUtil.ts`

### Approval Handling
The Yield.xyz API automatically includes approval transactions when needed. If user already has sufficient allowance, the approval step won't be in `transactions[]`. We don't need to check allowance ourselves.

### Status Tracking
- Fetch balances on mount
- Invalidate queries after transaction submit
- No polling for POC - can add later if needed

### Error Handling
- Disregard for POC
- Add proper error states in future iteration

### Account Selector
- Show BASE chainId accounts only
- Disabled for POC (account 0 always selected)
- Will enable in future

---

## Task Checklist

### Phase 1: Foundation
- [ ] Add env vars (VITE_YIELD_XYZ_API_KEY, VITE_YIELD_XYZ_BASE_URL)
- [ ] Add feature flag (YieldXyz)
- [ ] Update CSP (api.yield.xyz, assets.stakek.it)
- [ ] Create API client (src/lib/yieldxyz/api.ts)
- [ ] Create types (src/lib/yieldxyz/types.ts)

### Phase 2: React Query Hooks
- [ ] useYields
- [ ] useYield
- [ ] useYieldBalances
- [ ] useEnterYield
- [ ] useExitYield
- [ ] useSubmitYieldTransaction

### Phase 3: Transaction Signing
- [ ] Transaction parsing utilities
- [ ] Chain adapter integration

### Phase 4: Pages & Routing
- [ ] Add routes (/yields, /yields/:yieldId)
- [ ] Add nav item under Earn (feature-flagged)

### Phase 5: Components
- [ ] Yields.tsx (list page)
- [ ] Yield.tsx (detail page)
- [ ] YieldCard.tsx
- [ ] YieldEnterExit.tsx
- [ ] YieldTransactionSteps.tsx
- [ ] YieldYourInfo.tsx
- [ ] YieldStats.tsx

### Phase 6: Translations
- [ ] Add yields translations

### Phase 7 (Stretch)
- [ ] Action center integration for yield txs

### Phase 8 (Stretch)
- [ ] Asset page integration

---

## References

- [Yield.xyz API Reference](https://docs.yield.xyz/reference/getting-started-with-your-api)
- [Yield.xyz Actions Guide](https://docs.yield.xyz/docs/actions)
- [Yield.xyz Balances Guide](https://docs.yield.xyz/docs/balances)
- See `YIELD_XYZ_INTEGRATION.md` for detailed API findings
- See `yield_xyz_analysis.md` for API overview
