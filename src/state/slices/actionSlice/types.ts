import type { Asset, OrderId } from '@shapeshiftoss/types'

import type { LimitPriceByDirection } from '../limitOrderInputSlice/limitOrderInputSlice'

export enum ActionType {
  Deposit = 'Deposit',
  Claim = 'Claim',
  Swap = 'Swap',
  LimitOrder = 'LimitOrder',
}

export enum ActionStatus {
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
  quoteId: string
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
}

export type BaseAction = {
  id: string
  type: ActionType
  status: ActionStatus
  createdAt: number
  updatedAt: number
  title: string
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

export const isPendingSwapAction = (action: Action): action is SwapAction => {
  return Boolean(isSwapAction(action) && action.status === ActionStatus.Pending)
}

export const isOpenLimitOrderAction = (action: Action): action is LimitOrderAction => {
  return Boolean(isLimitOrderAction(action) && action.status === ActionStatus.Open)
}

export const isLimitOrderAction = (action: Action): action is LimitOrderAction => {
  return Boolean(
    action.type === ActionType.LimitOrder &&
      action.limitOrderMetadata &&
      ('quoteId' in action.limitOrderMetadata || 'limitOrderId' in action.limitOrderMetadata),
  )
}

export type PartialSwapActionUpdate = Partial<Omit<SwapAction, 'swapMetadata'>> & {
  swapMetadata: { swapId: string } & Partial<Omit<ActionSwapMetadata, 'swapId'>>
}

export type PartialLimitOrderActionUpdate = Partial<
  Omit<LimitOrderAction, 'limitOrderMetadata'>
> & {
  limitOrderMetadata: { quoteId: string } & Partial<Omit<ActionLimitOrderMetadata, 'quoteId'>>
}

export type PartialActionUpdateById = { id: string } & Partial<Omit<Action, 'id'>>

export type PartialActionUpdate =
  | PartialSwapActionUpdate
  | PartialLimitOrderActionUpdate
  | PartialActionUpdateById

export const isPartialSwapActionUpdate = (
  payload: PartialActionUpdate,
): payload is PartialSwapActionUpdate => {
  return 'swapMetadata' in payload && 'swapId' in payload.swapMetadata
}

export const isPartialLimitOrderActionUpdate = (
  payload: PartialActionUpdate,
): payload is PartialLimitOrderActionUpdate => {
  return 'limitOrderMetadata' in payload && 'quoteId' in payload.limitOrderMetadata
}

export const isPartialActionUpdateById = (
  payload: PartialActionUpdate,
): payload is PartialActionUpdateById => {
  return 'id' in payload
}
