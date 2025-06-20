import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset, CowSwapQuoteId, OrderId } from '@shapeshiftoss/types'

import type { LimitPriceByDirection } from '../limitOrderInputSlice/limitOrderInputSlice'

export enum ActionType {
  Deposit = 'Deposit',
  Claim = 'Claim',
  Swap = 'Swap',
  LimitOrder = 'LimitOrder',
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
  sellAsset: Asset
  buyAsset: Asset
  limitPrice: LimitPriceByDirection
  expires: number | undefined
  executedBuyAmountCryptoBaseUnit?: string
  executedSellAmountCryptoBaseUnit?: string
  filledDecimalPercentage?: string
  accountId: AccountId
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

export type Action = SwapAction | LimitOrderAction

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
