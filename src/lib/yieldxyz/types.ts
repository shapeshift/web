/**
 * Yield.xyz API Types
 * These types are derived from actual API responses.
 * DO NOT add derived/composite types - only what the API returns.
 * https://docs.yield.xyz/reference/
 */

// ============================================================================
// Enums (from API docs)
// ============================================================================

import type { AssetId, ChainId } from '@shapeshiftoss/caip'

export enum YieldNetwork {
  Ethereum = 'ethereum',
  Arbitrum = 'arbitrum',
  Base = 'base',
  Gnosis = 'gnosis',
  Optimism = 'optimism',
  Polygon = 'polygon',
  AvalancheC = 'avalanche-c',
  Binance = 'binance',
  Solana = 'solana',
  Cosmos = 'cosmos',
  Sui = 'sui',
  Monad = 'monad',
  Tron = 'tron',
}

export enum ActionIntent {
  Enter = 'enter',
  Exit = 'exit',
  Manage = 'manage',
}

export enum ActionStatus {
  Canceled = 'CANCELED',
  Created = 'CREATED',
  WaitingForNext = 'WAITING_FOR_NEXT',
  Processing = 'PROCESSING',
  Failed = 'FAILED',
  Success = 'SUCCESS',
  Stale = 'STALE',
}

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

// ============================================================================
// Token Types
// ============================================================================

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

// ============================================================================
// Balance Types
// ============================================================================

export enum YieldBalanceType {
  Active = 'active',
  Entering = 'entering',
  Exiting = 'exiting',
  Withdrawable = 'withdrawable',
  Claimable = 'claimable',
  Locked = 'locked',
}

export type YieldBalanceValidator = {
  address: string
  name: string
  logoURI: string
  status?: string
  apr?: number
  commission?: number
}

export type YieldBalance = {
  address: string
  amount: string
  amountRaw: string
  amountUsd: string
  type: YieldBalanceType
  token: YieldToken
  isEarning: boolean
  date?: string
  pendingActions: {
    type: string
    passthrough: string
  }[]
  validator?: YieldBalanceValidator
}

export type YieldBalancesResponse = {
  yieldId: string
  balances: YieldBalance[]
}

// ============================================================================
// Transaction Types
// ============================================================================

export type TransactionDto = {
  id: string
  title: string
  network: string
  status: TransactionStatus
  type: string
  hash: string | null
  createdAt: string
  broadcastedAt: string | null
  signedTransaction: string | null
  unsignedTransaction: string
  stepIndex: number
  gasEstimate: string
  explorerUrl?: string | null
  description?: string
  error?: string | null
  annotatedTransaction?: Record<string, unknown> | null
  isMessage?: boolean
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionDto = {
  id: string
  intent: ActionIntent
  type: string
  yieldId: string
  address: string
  amount: string | null
  amountRaw: string | null
  amountUsd: string | null
  transactions: TransactionDto[]
  executionPattern: 'synchronous' | 'asynchronous' | 'batch'
  rawArguments: Record<string, unknown> | null
  status: ActionStatus
  createdAt: string
  completedAt: string | null
}

export type ActionsResponse = {
  items: ActionDto[]
  total: number
  offset: number
  limit: number
}

// ============================================================================
// Yield Types (from GET /v1/yields/{yieldId})
// ============================================================================

export type YieldArgumentField = {
  name: string
  type: 'string' | 'number' | 'boolean'
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

export type YieldArguments = {
  enter: { fields: YieldArgumentField[] }
  exit: { fields: YieldArgumentField[] }
}

export type YieldRewardRateComponent = {
  rate: number
  rateType: 'APY' | 'APR'
  token: YieldToken
  yieldSource: string
  description: string
}

export type YieldRewardRate = {
  total: number
  rateType: 'APY' | 'APR'
  components: YieldRewardRateComponent[]
}

export type YieldStatistics = {
  tvlUsd: string
  tvl: string
  tvlRaw?: string
  uniqueUsers?: number | null
  averagePositionSizeUsd?: string | null
  averagePositionSize?: string | null
}

export type YieldMetadata = {
  name: string
  description: string
  logoURI: string
  documentation?: string
  underMaintenance: boolean
  deprecated: boolean
  supportedStandards?: string[]
}

export type YieldStatus = {
  enter: boolean
  exit: boolean
}

export type YieldEntryLimits = {
  minimum: string
  maximum: string | null
}

export type YieldMechanics = {
  type: string
  requiresValidatorSelection: boolean
  rewardSchedule: string
  rewardClaiming: string
  gasFeeToken: YieldToken
  entryLimits: YieldEntryLimits
  arguments: YieldArguments
  supportsLedgerWalletApi?: boolean
  possibleFeeTakingMechanisms?: {
    depositFee: boolean
    managementFee: boolean
    performanceFee: boolean
    validatorRebates: boolean
  }
}

export type YieldDto = {
  id: string
  network: string
  chainId: string
  providerId: string
  token: YieldToken
  inputTokens: YieldToken[]
  outputToken?: YieldToken
  rewardRate: YieldRewardRate
  statistics: YieldStatistics
  status: YieldStatus
  metadata: YieldMetadata
  mechanics: YieldMechanics
  tags: string[]
  tokens: YieldToken[]
  state?: {
    capacityState?: {
      current: string
      max: string
      remaining: string
    }
  }
}

export type YieldsResponse = {
  items: YieldDto[]
  total: number
  offset: number
  limit: number
}

// ============================================================================
// Validator Types
// ============================================================================

export type ValidatorDto = {
  address: string
  preferred: boolean
  name: string
  logoURI: string
  website?: string
  commission: number
  votingPower: number
  status: string
  tvl: string
  tvlRaw: string
  rewardRate: YieldRewardRate
}

export type YieldValidatorsResponse = {
  items: ValidatorDto[]
  total: number
  offset: number
  limit: number
}

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderDto = {
  id: string
  name: string
  logoURI: string
  description?: string
  documentation?: string
}

export type ProvidersResponse = {
  items: ProviderDto[]
  total: number
  offset: number
  limit: number
}

// ============================================================================
// Network Types
// ============================================================================

export type NetworkDto = {
  id: string
  name: string
  category: string
  logoURI: string
  chainId?: number
}

export type NetworksResponse = NetworkDto[]

// ============================================================================
// Augmented Types (ShapeShift-specific, derived from API types)
// These types add CAIP-2 ChainId and CAIP-19 AssetId for ShapeShift integration
// ============================================================================

export type AugmentedYieldToken = YieldToken & {
  chainId: ChainId | undefined
  assetId: AssetId | undefined
}

export type AugmentedYieldRewardRateComponent = Omit<YieldRewardRateComponent, 'token'> & {
  token: AugmentedYieldToken
}

export type AugmentedYieldRewardRate = Omit<YieldRewardRate, 'components'> & {
  components: AugmentedYieldRewardRateComponent[]
}

export type AugmentedYieldMechanics = Omit<YieldMechanics, 'gasFeeToken'> & {
  gasFeeToken: AugmentedYieldToken
}

export type AugmentedYieldBalance = Omit<YieldBalance, 'token'> & {
  token: AugmentedYieldToken
  highestAmountUsdValidator?: string
}

export type AugmentedYieldDto = Omit<
  YieldDto,
  'chainId' | 'token' | 'inputTokens' | 'outputToken' | 'rewardRate' | 'mechanics' | 'tokens'
> & {
  chainId: ChainId | undefined
  evmNetworkId: string | undefined
  token: AugmentedYieldToken
  inputTokens: AugmentedYieldToken[]
  outputToken: AugmentedYieldToken | undefined
  rewardRate: AugmentedYieldRewardRate
  mechanics: AugmentedYieldMechanics
  tokens: AugmentedYieldToken[]
}

// ============================================================================
// Parsed Types (for utils)
// ============================================================================

export type ParsedUnsignedTransaction = {
  from: string
  to: string
  data: string
  value?: string
  nonce: number
  type?: number
  gasLimit: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  gasPrice?: string
  chainId: number
}

export type ParsedGasEstimate = {
  token: {
    name: string
    symbol: string
    logoURI: string
    network: string
    decimals: number
    coinGeckoId?: string
  }
  amount: string
  gasLimit: string
}
