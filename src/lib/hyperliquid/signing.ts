// ============================================================================
// Hyperliquid Signing Utilities
// Handles L1 action signing with chainId 1337 for Hyperliquid protocol
// ============================================================================

import type { Address, Hex, TypedDataDomain } from 'viem'
import { keccak256, toHex } from 'viem'

// ============================================================================
// Constants
// ============================================================================

export const HYPERLIQUID_CHAIN_ID = 1337

const EXCHANGE_DOMAIN: TypedDataDomain = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000' as const,
}

const HYPERLIQUID_L1_DOMAIN: TypedDataDomain = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000' as const,
}

// ============================================================================
// EIP-712 Type Definitions
// Field order matters for msgpack serialization
// ============================================================================

export const AGENT_TYPES = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
} as const

export const ORDER_TYPES = {
  Order: [
    { name: 'a', type: 'uint32' },
    { name: 'b', type: 'bool' },
    { name: 'p', type: 'string' },
    { name: 's', type: 'string' },
    { name: 'r', type: 'bool' },
    { name: 't', type: 'OrderType' },
    { name: 'c', type: 'string' },
  ],
  OrderType: [
    { name: 'limit', type: 'LimitType' },
  ],
  LimitType: [
    { name: 'tif', type: 'string' },
  ],
} as const

export const ORDER_ACTION_TYPES = {
  OrderAction: [
    { name: 'type', type: 'string' },
    { name: 'orders', type: 'Order[]' },
    { name: 'grouping', type: 'string' },
  ],
  ...ORDER_TYPES,
} as const

export const CANCEL_TYPES = {
  CancelAction: [
    { name: 'type', type: 'string' },
    { name: 'cancels', type: 'Cancel[]' },
  ],
  Cancel: [
    { name: 'a', type: 'uint32' },
    { name: 'o', type: 'uint64' },
  ],
} as const

export const CANCEL_BY_CLOID_TYPES = {
  CancelByCloidAction: [
    { name: 'type', type: 'string' },
    { name: 'cancels', type: 'CancelByCloid[]' },
  ],
  CancelByCloid: [
    { name: 'asset', type: 'uint32' },
    { name: 'cloid', type: 'string' },
  ],
} as const

export const MODIFY_TYPES = {
  ModifyAction: [
    { name: 'type', type: 'string' },
    { name: 'oid', type: 'uint64' },
    { name: 'order', type: 'Order' },
  ],
  ...ORDER_TYPES,
} as const

export const BATCH_MODIFY_TYPES = {
  BatchModifyAction: [
    { name: 'type', type: 'string' },
    { name: 'modifies', type: 'Modify[]' },
  ],
  Modify: [
    { name: 'oid', type: 'uint64' },
    { name: 'order', type: 'Order' },
  ],
  ...ORDER_TYPES,
} as const

export const UPDATE_LEVERAGE_TYPES = {
  UpdateLeverageAction: [
    { name: 'type', type: 'string' },
    { name: 'asset', type: 'uint32' },
    { name: 'isCross', type: 'bool' },
    { name: 'leverage', type: 'uint32' },
  ],
} as const

export const UPDATE_ISOLATED_MARGIN_TYPES = {
  UpdateIsolatedMarginAction: [
    { name: 'type', type: 'string' },
    { name: 'asset', type: 'uint32' },
    { name: 'isBuy', type: 'bool' },
    { name: 'ntli', type: 'int64' },
  ],
} as const

export const USD_TRANSFER_TYPES = {
  UsdClassTransferAction: [
    { name: 'type', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'toPerp', type: 'bool' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const

export const WITHDRAW_TYPES = {
  Withdraw3Action: [
    { name: 'type', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'time', type: 'uint64' },
  ],
} as const

export const TRANSFER_TYPES = {
  UsdSendAction: [
    { name: 'type', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'time', type: 'uint64' },
  ],
} as const

export const APPROVE_AGENT_TYPES = {
  ApproveAgentAction: [
    { name: 'type', type: 'string' },
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'agentAddress', type: 'address' },
    { name: 'agentName', type: 'string' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const

export const APPROVE_BUILDER_FEE_TYPES = {
  ApproveBuilderFeeAction: [
    { name: 'type', type: 'string' },
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'maxFeeRate', type: 'string' },
    { name: 'builder', type: 'address' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const

// ============================================================================
// Action Types
// ============================================================================

export type OrderAction = {
  type: 'order'
  orders: Array<{
    a: number
    b: boolean
    p: string
    s: string
    r: boolean
    t: { limit: { tif: string } } | { trigger: { isMarket: boolean; triggerPx: string; tpsl: string } }
    c?: string
  }>
  grouping: 'na' | 'normalTpsl' | 'positionTpsl'
}

export type CancelAction = {
  type: 'cancel'
  cancels: Array<{
    a: number
    o: number
  }>
}

export type CancelByCloidAction = {
  type: 'cancelByCloid'
  cancels: Array<{
    asset: number
    cloid: string
  }>
}

export type ModifyAction = {
  type: 'modify'
  oid: number
  order: OrderAction['orders'][0]
}

export type BatchModifyAction = {
  type: 'batchModify'
  modifies: Array<{
    oid: number
    order: OrderAction['orders'][0]
  }>
}

export type UpdateLeverageAction = {
  type: 'updateLeverage'
  asset: number
  isCross: boolean
  leverage: number
}

export type UpdateIsolatedMarginAction = {
  type: 'updateIsolatedMargin'
  asset: number
  isBuy: boolean
  ntli: number
}

export type UsdClassTransferAction = {
  type: 'usdClassTransfer'
  amount: string
  toPerp: boolean
  nonce: number
}

export type Withdraw3Action = {
  type: 'withdraw3'
  destination: string
  amount: string
  time: number
}

export type UsdSendAction = {
  type: 'usdSend'
  destination: string
  amount: string
  time: number
}

export type ApproveAgentAction = {
  type: 'approveAgent'
  hyperliquidChain: 'Mainnet' | 'Testnet'
  agentAddress: Address
  agentName: string | null
  nonce: number
}

export type ApproveBuilderFeeAction = {
  type: 'approveBuilderFee'
  hyperliquidChain: 'Mainnet' | 'Testnet'
  maxFeeRate: string
  builder: Address
  nonce: number
}

export type HyperliquidAction =
  | OrderAction
  | CancelAction
  | CancelByCloidAction
  | ModifyAction
  | BatchModifyAction
  | UpdateLeverageAction
  | UpdateIsolatedMarginAction
  | UsdClassTransferAction
  | Withdraw3Action
  | UsdSendAction
  | ApproveAgentAction
  | ApproveBuilderFeeAction

// ============================================================================
// Signing Payload Types
// ============================================================================

export type SigningPayload = {
  domain: TypedDataDomain
  types: Record<string, readonly { name: string; type: string }[]>
  primaryType: string
  message: Record<string, unknown>
}

// ============================================================================
// Helper Functions
// ============================================================================

export const getExchangeDomain = (): TypedDataDomain => EXCHANGE_DOMAIN

export const getHyperliquidL1Domain = (): TypedDataDomain => HYPERLIQUID_L1_DOMAIN

export const generateNonce = (): number => {
  return Date.now()
}

export const hashAction = (action: HyperliquidAction): Hex => {
  const jsonString = JSON.stringify(action)
  return keccak256(toHex(jsonString))
}

// ============================================================================
// Signing Payload Builders
// Each function creates an EIP-712 typed data payload for signing
// IMPORTANT: Use chainId 1337 for all L1 actions, not the actual network chainId
// ============================================================================

export const buildOrderSigningPayload = (action: OrderAction): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: ORDER_ACTION_TYPES,
  primaryType: 'OrderAction',
  message: action,
})

export const buildCancelSigningPayload = (action: CancelAction): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: CANCEL_TYPES,
  primaryType: 'CancelAction',
  message: action,
})

export const buildCancelByCloidSigningPayload = (action: CancelByCloidAction): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: CANCEL_BY_CLOID_TYPES,
  primaryType: 'CancelByCloidAction',
  message: action,
})

export const buildModifySigningPayload = (action: ModifyAction): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: MODIFY_TYPES,
  primaryType: 'ModifyAction',
  message: action,
})

export const buildBatchModifySigningPayload = (action: BatchModifyAction): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: BATCH_MODIFY_TYPES,
  primaryType: 'BatchModifyAction',
  message: action,
})

export const buildUpdateLeverageSigningPayload = (
  action: UpdateLeverageAction,
): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: UPDATE_LEVERAGE_TYPES,
  primaryType: 'UpdateLeverageAction',
  message: action,
})

export const buildUpdateIsolatedMarginSigningPayload = (
  action: UpdateIsolatedMarginAction,
): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: UPDATE_ISOLATED_MARGIN_TYPES,
  primaryType: 'UpdateIsolatedMarginAction',
  message: action,
})

export const buildUsdClassTransferSigningPayload = (
  action: UsdClassTransferAction,
): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: USD_TRANSFER_TYPES,
  primaryType: 'UsdClassTransferAction',
  message: action,
})

export const buildWithdrawSigningPayload = (action: Withdraw3Action): SigningPayload => ({
  domain: HYPERLIQUID_L1_DOMAIN,
  types: WITHDRAW_TYPES,
  primaryType: 'Withdraw3Action',
  message: action,
})

export const buildUsdSendSigningPayload = (action: UsdSendAction): SigningPayload => ({
  domain: HYPERLIQUID_L1_DOMAIN,
  types: TRANSFER_TYPES,
  primaryType: 'UsdSendAction',
  message: action,
})

export const buildApproveAgentSigningPayload = (action: ApproveAgentAction): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: APPROVE_AGENT_TYPES,
  primaryType: 'ApproveAgentAction',
  message: action,
})

export const buildApproveBuilderFeeSigningPayload = (
  action: ApproveBuilderFeeAction,
): SigningPayload => ({
  domain: EXCHANGE_DOMAIN,
  types: APPROVE_BUILDER_FEE_TYPES,
  primaryType: 'ApproveBuilderFeeAction',
  message: action,
})

export const buildSigningPayload = (action: HyperliquidAction): SigningPayload => {
  switch (action.type) {
    case 'order':
      return buildOrderSigningPayload(action)
    case 'cancel':
      return buildCancelSigningPayload(action)
    case 'cancelByCloid':
      return buildCancelByCloidSigningPayload(action)
    case 'modify':
      return buildModifySigningPayload(action)
    case 'batchModify':
      return buildBatchModifySigningPayload(action)
    case 'updateLeverage':
      return buildUpdateLeverageSigningPayload(action)
    case 'updateIsolatedMargin':
      return buildUpdateIsolatedMarginSigningPayload(action)
    case 'usdClassTransfer':
      return buildUsdClassTransferSigningPayload(action)
    case 'withdraw3':
      return buildWithdrawSigningPayload(action)
    case 'usdSend':
      return buildUsdSendSigningPayload(action)
    case 'approveAgent':
      return buildApproveAgentSigningPayload(action)
    case 'approveBuilderFee':
      return buildApproveBuilderFeeSigningPayload(action)
    default:
      throw new Error(`Unknown action type: ${(action as HyperliquidAction).type}`)
  }
}

// ============================================================================
// Signature Utilities
// ============================================================================

export type SignatureComponents = {
  r: Hex
  s: Hex
  v: number
}

export const splitSignature = (signature: Hex): SignatureComponents => {
  const sig = signature.slice(2)
  return {
    r: `0x${sig.slice(0, 64)}` as Hex,
    s: `0x${sig.slice(64, 128)}` as Hex,
    v: parseInt(sig.slice(128, 130), 16),
  }
}

export const formatSignatureForApi = (signature: Hex): { r: Hex; s: Hex; v: number } => {
  const { r, s, v } = splitSignature(signature)
  return { r, s, v }
}

export const isValidSignature = (signature: Hex): boolean => {
  if (!signature.startsWith('0x')) return false
  const cleanSig = signature.slice(2)
  return cleanSig.length === 130
}

// ============================================================================
// Validation Utilities
// ============================================================================

export const validateOrderAction = (action: OrderAction): boolean => {
  if (!action.orders?.length) return false
  return action.orders.every(
    order =>
      typeof order.a === 'number' &&
      typeof order.b === 'boolean' &&
      typeof order.p === 'string' &&
      typeof order.s === 'string' &&
      typeof order.r === 'boolean' &&
      order.t !== undefined,
  )
}

export const validateCancelAction = (action: CancelAction): boolean => {
  if (!action.cancels?.length) return false
  return action.cancels.every(
    cancel => typeof cancel.a === 'number' && typeof cancel.o === 'number',
  )
}

export const validateWithdrawAction = (action: Withdraw3Action): boolean => {
  return (
    typeof action.destination === 'string' &&
    action.destination.startsWith('0x') &&
    typeof action.amount === 'string' &&
    typeof action.time === 'number'
  )
}

export const validateAction = (action: HyperliquidAction): boolean => {
  switch (action.type) {
    case 'order':
      return validateOrderAction(action)
    case 'cancel':
      return validateCancelAction(action)
    case 'withdraw3':
      return validateWithdrawAction(action)
    default:
      return true
  }
}

// ============================================================================
// Error Handling
// ============================================================================

export class HyperliquidSigningError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'HyperliquidSigningError'
  }
}

export const SIGNING_ERROR_CODES = {
  INVALID_ACTION: 'INVALID_ACTION',
  SIGNATURE_REJECTED: 'SIGNATURE_REJECTED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  UNSUPPORTED_ACTION: 'UNSUPPORTED_ACTION',
} as const

export type SigningErrorCode = (typeof SIGNING_ERROR_CODES)[keyof typeof SIGNING_ERROR_CODES]
