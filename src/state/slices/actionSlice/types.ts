import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset, CowSwapQuoteId, OrderId } from '@shapeshiftoss/types'

import type { LimitPriceByDirection } from '../limitOrderInputSlice/limitOrderInputSlice'

import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery'

export enum ActionType {
  Deposit = 'Deposit',
  Claim = 'Claim',
  Swap = 'Swap',
  LimitOrder = 'LimitOrder',
  GenericTransaction = 'GenericTransaction',
  AppUpdate = 'AppUpdate',
  RfoxClaim = 'RfoxClaim',
}

export enum ActionStatus {
  Idle = 'Idle',
  Pending = 'Pending',
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
}

type ActionGenericTransactionMetadata = {
  displayType: GenericTransactionDisplayType
  message: string
  accountId: AccountId
  txHash: string
  chainId: ChainId
  assetId: AssetId
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
  type: ActionType.GenericTransaction
  transactionMetadata: ActionGenericTransactionMetadata
}

export type AppUpdateAction = BaseAction & {
  type: ActionType.AppUpdate
  appUpdateMetadata: ActionAppUpdateMetadata
}

export type RfoxClaimAction = BaseAction & {
  type: ActionType.RfoxClaim
  rfoxClaimActionMetadata: {
    message: string
    request: UnstakingRequest
    txHash?: string
  }
}

export type Action =
  | SwapAction
  | LimitOrderAction
  | AppUpdateAction
  | GenericTransactionAction
  | RfoxClaimAction

export type ActionState = {
  byId: Record<string, Action>
  ids: string[]
}

export const isSwapAction = (action: Action): action is SwapAction => {
  return Boolean(
    action.type === ActionType.Swap && action.swapMetadata && 'swapId' in action.swapMetadata,
  )
}

export const isLimitOrderAction = (action: Action): action is LimitOrderAction => {
  return Boolean(action.type === ActionType.LimitOrder && action.limitOrderMetadata)
}

export const isPendingSwapAction = (action: Action): action is SwapAction => {
  return Boolean(isSwapAction(action) && action.status === ActionStatus.Pending)
}

export const isGenericTransactionAction = (action: Action): action is GenericTransactionAction => {
  return Boolean(action.type === ActionType.GenericTransaction && action.transactionMetadata)
}

export const isRfoxClaimAction = (action: Action): action is RfoxClaimAction => {
  return Boolean(action.type === ActionType.RfoxClaim && action.rfoxClaimActionMetadata)
}
