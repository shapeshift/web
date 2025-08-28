import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset, CowSwapQuoteId, OrderId } from '@shapeshiftoss/types'

import type { LimitPriceByDirection } from '../limitOrderInputSlice/limitOrderInputSlice'
import type { ApprovalExecutionMetadata } from '../tradeQuoteSlice/types'

import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from '@/lib/utils/thorchain/lp/types'
import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'
import type { Claim } from '@/pages/TCY/components/Claim/types'

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

export type Action =
  | SwapAction
  | LimitOrderAction
  | AppUpdateAction
  | GenericTransactionAction
  | RfoxClaimAction
  | TcyClaimAction

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

export const isThorchainLpAction = (action: Action): action is GenericTransactionAction => {
  return Boolean(
    (action.type === ActionType.Deposit || action.type === ActionType.Withdraw) &&
      action.transactionMetadata?.displayType === GenericTransactionDisplayType.ThorchainLP,
  )
}

export const isPendingSendAction = (action: Action): action is GenericTransactionAction => {
  return Boolean(isSendAction(action) && action.status === ActionStatus.Pending)
}
