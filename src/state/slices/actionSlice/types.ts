import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset, CowSwapQuoteId, OrderId } from '@shapeshiftoss/types'

import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from '@/lib/utils/thorchain/lp/types'
import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'
import type { RewardDistributionWithMetadata } from '@/pages/RFOX/hooks/useLifetimeRewardDistributionsQuery'
import type { Claim } from '@/pages/TCY/components/Claim/types'
import type { LimitPriceByDirection } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import type { ApprovalExecutionMetadata } from '@/state/slices/tradeQuoteSlice/types'

// TODO: ClaimDetails type from deleted Claims tab - define locally if needed
type ClaimDetails = any

export enum ActionType {
  Deposit = 'Deposit',
  Withdraw = 'Withdraw',
  Claim = 'Claim',
  Swap = 'Swap',
  LimitOrder = 'LimitOrder',
  AppUpdate = 'AppUpdate',
  RfoxClaim = 'RfoxClaim',
  TcyClaim = 'TcyClaim',
  Send = 'Send',
  Approve = 'Approve',
  ChangeAddress = 'ChangeAddress',
  RewardDistribution = 'RewardDistribution',
  ArbitrumBridgeWithdraw = 'ArbitrumBridgeWithdraw',
}

export enum ActionStatus {
  Idle = 'Idle',
  AwaitingApproval = 'AwaitingApproval',
  AwaitingSwap = 'AwaitingSwap',
  Abandoned = 'Abandoned',
  Pending = 'Pending',
  Initiated = 'Initiated',
  Complete = 'Complete',
  Failed = 'Failed',
  ClaimAvailable = 'ClaimAvailable',
  Claimed = 'Claimed',
  Open = 'Open',
  Expired = 'Expired',
  Cancelled = 'Cancelled',
}

type ActionSwapMetadata = {
  swapId: string
  allowanceApproval?: ApprovalExecutionMetadata | undefined
  isPermit2Required?: boolean
}

type ActionLimitOrderMetadata = {
  cowSwapQuoteId: CowSwapQuoteId
  limitOrderId?: OrderId
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
  sellAmountCryptoPrecision: string
  buyAmountCryptoPrecision: string
  sellAsset: Asset
  buyAsset: Asset
  limitPrice: LimitPriceByDirection
  expires: number | undefined
  executedBuyAmountCryptoBaseUnit?: string
  executedSellAmountCryptoBaseUnit?: string
  executedBuyAmountCryptoPrecision?: string
  executedSellAmountCryptoPrecision?: string
  filledDecimalPercentage?: string
  accountId: AccountId
}

type ActionAppUpdateMetadata = {
  currentVersion: string
}

type ActionArbitrumBridgeWithdrawMetadata = {
  withdrawTxHash: string
  claimTxHash?: string
  amountCryptoBaseUnit: string
  assetId: AssetId
  destinationAssetId: AssetId
  accountId: AccountId
  destinationAccountId: AccountId
  timeRemainingSeconds?: number
  claimDetails?: ClaimDetails
}

export enum GenericTransactionDisplayType {
  TCY = 'TCY',
  RFOX = 'rFOX',
  Bridge = 'Bridge',
  FoxFarm = 'FOX Farming',
  SEND = 'Send',
  Approve = 'Approve',
  ThorchainLP = 'ThorchainLP',
}

export enum GenericTransactionQueryId {
  RFOX = 'rFOX',
  TCY = 'TCY',
}

type ActionGenericTransactionMetadata = {
  displayType: GenericTransactionDisplayType
  queryId?: GenericTransactionQueryId
  message: string
  accountId: AccountId
  txHash: string
  chainId: ChainId
  assetId: AssetId
  amountCryptoPrecision: string | undefined
  newAddress?: string
  contractName?: string
  cooldownPeriod?: string
  cooldownPeriodSeconds?: number
  thorMemo?: string | null
  confirmedQuote?: LpConfirmedWithdrawalQuote | LpConfirmedDepositQuote
  assetAmountsAndSymbols?: string
  poolName?: string
}

export type BaseAction = {
  id: string
  type: ActionType
  status: ActionStatus
  createdAt: number
  updatedAt: number
}

export type SwapAction = BaseAction & {
  type: ActionType.Swap
  swapMetadata: ActionSwapMetadata
}

export type LimitOrderAction = BaseAction & {
  type: ActionType.LimitOrder
  limitOrderMetadata: ActionLimitOrderMetadata
}

export type GenericTransactionAction = BaseAction & {
  type:
    | ActionType.Deposit
    | ActionType.Withdraw
    | ActionType.Claim
    | ActionType.ChangeAddress
    | ActionType.Send
    | ActionType.Approve

  transactionMetadata: ActionGenericTransactionMetadata
}

export type AppUpdateAction = BaseAction & {
  type: ActionType.AppUpdate
  appUpdateMetadata: ActionAppUpdateMetadata
}

export type RfoxClaimAction = BaseAction & {
  type: ActionType.RfoxClaim
  rfoxClaimActionMetadata: {
    request: UnstakingRequest
    txHash?: string
  }
}

export type TcyClaimAction = BaseAction & {
  type: ActionType.TcyClaim
  tcyClaimActionMetadata: {
    claim: Claim
    txHash?: string
  }
}

export type RewardDistributionAction = BaseAction & {
  type: ActionType.RewardDistribution
  rewardDistributionMetadata: {
    distribution: RewardDistributionWithMetadata
    txHash?: string
  }
}

export type ArbitrumBridgeWithdrawAction = BaseAction & {
  type: ActionType.ArbitrumBridgeWithdraw
  arbitrumBridgeMetadata: ActionArbitrumBridgeWithdrawMetadata
}

export type Action =
  | SwapAction
  | LimitOrderAction
  | AppUpdateAction
  | GenericTransactionAction
  | RfoxClaimAction
  | TcyClaimAction
  | RewardDistributionAction
  | ArbitrumBridgeWithdrawAction

export type ActionState = {
  byId: Record<string, Action>
  ids: string[]
}

export const isSwapAction = (action: Action): action is SwapAction => {
  return Boolean(
    action.type === ActionType.Swap && action.swapMetadata && 'swapId' in action.swapMetadata,
  )
}

export const isSendAction = (action: Action): action is GenericTransactionAction => {
  return Boolean(
    action.type === ActionType.Send &&
      action.transactionMetadata?.displayType === GenericTransactionDisplayType.SEND,
  )
}

export const isLimitOrderAction = (action: Action): action is LimitOrderAction => {
  return Boolean(action.type === ActionType.LimitOrder && action.limitOrderMetadata)
}

export const isPendingSwapAction = (action: Action): action is SwapAction => {
  return Boolean(isSwapAction(action) && action.status === ActionStatus.Pending)
}

export const isGenericTransactionAction = (action: Action): action is GenericTransactionAction => {
  return Boolean((action as GenericTransactionAction).transactionMetadata)
}

export const isRfoxClaimAction = (action: Action): action is RfoxClaimAction => {
  return Boolean(action.type === ActionType.RfoxClaim && action.rfoxClaimActionMetadata)
}

export const isTcyClaimAction = (action: Action): action is TcyClaimAction => {
  return Boolean(action.type === ActionType.TcyClaim && action.tcyClaimActionMetadata)
}

export const isRewardDistributionAction = (action: Action): action is RewardDistributionAction => {
  return Boolean(action.type === ActionType.RewardDistribution && action.rewardDistributionMetadata)
}

export const isThorchainLpAction = (action: Action): action is GenericTransactionAction => {
  return Boolean(
    (action.type === ActionType.Deposit || action.type === ActionType.Withdraw) &&
      action.transactionMetadata?.displayType === GenericTransactionDisplayType.ThorchainLP,
  )
}

export const isPendingSendAction = (action: Action): action is GenericTransactionAction => {
  return Boolean(isSendAction(action) && action.status === ActionStatus.Pending)
}

export const isArbitrumBridgeWithdrawAction = (
  action: Action,
): action is ArbitrumBridgeWithdrawAction => {
  return Boolean(action.type === ActionType.ArbitrumBridgeWithdraw && action.arbitrumBridgeMetadata)
}
