import type { ChainId } from '@shapeshiftoss/caip'

import { gardenAssetRegistry } from './gardenAssetRegistry'

export const gardenSupportedChainIds: readonly ChainId[] = Array.from(
  new Set(gardenAssetRegistry.map(a => a.chainId)),
)

export type GardenAssetId = string

export type GardenAffiliateFeeAsset = 'base:cbbtc' | 'ethereum:cbbtc' | 'ethereum:usdc'

export type GardenAccount = {
  asset: GardenAssetId
  owner: string
  amount: string
  delegate?: string
}

export type GardenAffiliateFeeEntry = {
  asset: GardenAffiliateFeeAsset
  address: string
  fee: number
}

export type GardenQuoteResultItem = {
  source: { asset: GardenAssetId; amount: string; display: string; value: string }
  destination: { asset: GardenAssetId; amount: string; display: string; value: string }
  solver_id: string
  estimated_time: number
  slippage: number
  fee: number
  fixed_fee: string
}

export type GardenResponseEnvelope<T> = {
  status: 'Ok' | 'Error'
  result?: T
  error?: string
}

export type GardenQuoteResponse = GardenResponseEnvelope<GardenQuoteResultItem[]>

export type GardenOrderRequest = {
  source: GardenAccount
  destination: GardenAccount
  solver_id?: string
  slippage?: number
  nonce?: string
  affiliate_fees?: GardenAffiliateFeeEntry[]
}

export type GardenBitcoinInitiateResult = {
  order_id: string
  to: string
  amount: string
}

export type GardenStarknetCall = {
  to: string
  selector: string
  calldata: string[]
}

export type GardenStarknetInitiateResult = {
  order_id: string
  approval_transaction: GardenStarknetCall
  initiate_transaction: GardenStarknetCall
  typed_data?: unknown
}

export type GardenEvmTransactionData = {
  chain_id: number
  data: string
  gas_limit: string
  to: string
  value: string
}

export type GardenEvmInitiateResult = {
  order_id: string
  approval_transaction: GardenEvmTransactionData
  initiate_transaction: GardenEvmTransactionData
  typed_data?: unknown
}

export type GardenCreateOrderResult =
  | GardenBitcoinInitiateResult
  | GardenStarknetInitiateResult
  | GardenEvmInitiateResult

export type GardenCreateOrderResponse = GardenResponseEnvelope<GardenCreateOrderResult>

export const isGardenBitcoinInitiate = (
  result: GardenCreateOrderResult,
): result is GardenBitcoinInitiateResult => {
  return 'to' in result && typeof result.to === 'string' && !('initiate_transaction' in result)
}

export const isGardenStarknetInitiate = (
  result: GardenCreateOrderResult,
): result is GardenStarknetInitiateResult => {
  if (!('initiate_transaction' in result)) return false
  const initiate = (result as GardenStarknetInitiateResult).initiate_transaction
  return (
    initiate !== undefined &&
    'selector' in initiate &&
    Array.isArray((initiate as GardenStarknetCall).calldata)
  )
}

export const isGardenEvmInitiate = (
  result: GardenCreateOrderResult,
): result is GardenEvmInitiateResult => {
  if (!('initiate_transaction' in result)) return false
  const initiate = (result as GardenEvmInitiateResult).initiate_transaction
  return (
    initiate !== undefined && typeof (initiate as GardenEvmTransactionData).chain_id === 'number'
  )
}

export type GardenSwapState = {
  created_at: string
  swap_id: string
  chain: string
  asset: GardenAssetId
  initiator: string
  redeemer: string
  delegate?: string
  timelock: number
  filled_amount: string
  asset_price: number
  amount: string
  secret_hash: string
  secret: string
  initiate_tx_hash: string
  redeem_tx_hash: string
  refund_tx_hash: string
  initiate_block_number: string
  redeem_block_number: string
  refund_block_number: string
  required_confirmations: number
  current_confirmations: number
  initiate_timestamp: string | null
  redeem_timestamp: string | null
  refund_timestamp: string | null
  instant_refund_tx?: string
}

export type GardenOrder = {
  created_at: string
  order_id: string
  source_swap: GardenSwapState
  destination_swap: GardenSwapState
  nonce: string
  deadline: number
  affiliate_fees: GardenAffiliateFeeEntry[]
  integrator?: string
  version?: string
  solver_id?: string
}

export type GardenOrderResponse = GardenResponseEnvelope<GardenOrder>

export type GardenSpecificMetadata = {
  orderId: string
  bitcoinDepositAddress?: string
  starknetCalls?: GardenStarknetCall[]
  evmInitiate?: {
    to: string
    data: string
    value: string
    gasLimit: string
    allowanceContract: string
  }
  estimatedTimeMs: number
}
