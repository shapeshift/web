import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset, OrderId, QuoteId } from '@shapeshiftoss/types'

import type { PriceDirection } from '../limitOrderInputSlice/constants'

export enum ActionCenterType {
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

export type ActionId = string

type ActionSwapMetadata = {
  swapId: string
}

export type ActionLimitPrice = {
  [PriceDirection.BuyAssetDenomination]: string
  [PriceDirection.SellAssetDenomination]: string
}

type ActionLimitOrderMetadata = {
  quoteId: QuoteId
  limitOrderId?: OrderId
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
  limitPrice: ActionLimitPrice
  expires: number | undefined
  executedBuyAmountCryptoBaseUnit?: string
  executedSellAmountCryptoBaseUnit?: string
  filledDecimalPercentage?: string
}

export type SwapAction = {
  id: ActionId
  type: ActionCenterType.Swap
  status: ActionStatus
  createdAt: number
  updatedAt: number
  title: string
  assetIds: AssetId[]
  metadata: ActionSwapMetadata
  initiatorAccountId: AccountId
}

export type LimitOrderAction = {
  id: ActionId
  type: ActionCenterType.LimitOrder
  status: ActionStatus
  createdAt: number
  updatedAt: number
  title: string
  assetIds: AssetId[]
  metadata: ActionLimitOrderMetadata
  initiatorAccountId: AccountId
}

export type BaseAction = {
  id: ActionId
  type: ActionCenterType
  status: ActionStatus
  createdAt: number
  updatedAt: number
  title: string
  assetIds: AssetId[]
  metadata: undefined
  initiatorAccountId: AccountId | undefined
}

export type Action = SwapAction | LimitOrderAction | BaseAction

export type ActionCenterState = {
  actions: Action[]
}

export type ActionPayload =
  | ({ metadata?: ActionSwapMetadata } & Omit<
      SwapAction,
      'metadata' | 'id' | 'createdAt' | 'updatedAt'
    >)
  | ({ metadata?: ActionLimitOrderMetadata } & Omit<
      LimitOrderAction,
      'metadata' | 'id' | 'createdAt' | 'updatedAt'
    >)
  | ({ metadata?: undefined } & Omit<BaseAction, 'metadata' | 'id' | 'createdAt' | 'updatedAt'>)

export type ActionUpdatePayload =
  | ({ metadata?: Partial<ActionSwapMetadata> } & Partial<Omit<SwapAction, 'type' | 'metadata'>>)
  | ({ metadata?: Partial<ActionLimitOrderMetadata> } & Partial<
      Omit<LimitOrderAction, 'type' | 'metadata'>
    >)
  | ({ metadata?: undefined } & Partial<Omit<BaseAction, 'type' | 'metadata'>>)

export const isAction = (action: ActionPayload | ActionUpdatePayload): action is Action => {
  return 'id' in action
}

export const isTradePayloadDiscriminator = (
  action: ActionPayload | ActionUpdatePayload,
): action is SwapAction => {
  return Boolean(action.metadata && 'swapId' in action.metadata)
}

export const isLimitOrderPayloadDiscriminator = (
  action: ActionPayload | ActionUpdatePayload,
): action is LimitOrderAction => {
  return Boolean(
    action.metadata && ('quoteId' in action.metadata || 'limitOrderId' in action.metadata),
  )
}
