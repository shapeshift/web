import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { SupportedTradeQuoteStepIndex, TradeQuote, TradeRate } from '@shapeshiftoss/swapper'

export enum ActionCenterType {
  Deposit = 'Deposit',
  Claim = 'Claim',
  Swap = 'Swap',
  Limit = 'Limit',
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
  sellTxHash: string
  quote: TradeQuote | TradeRate
  stepIndex: SupportedTradeQuoteStepIndex
  swapId: string
  sellAccountId: AccountId
}

type ActionLimitOrderMetadata = {
  limitOrderId: string
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
}

export type LimitOrderAction = {
  id: ActionId
  type: ActionCenterType.Limit
  status: ActionStatus
  createdAt: number
  updatedAt: number
  title: string
  assetIds: AssetId[]
  metadata: ActionLimitOrderMetadata
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
  return Boolean(action.metadata && 'limitOrderId' in action.metadata)
}
