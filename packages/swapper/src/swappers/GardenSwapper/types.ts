export type GardenAssetId = string

export type GardenAffiliateFeeAsset = 'base:cbbtc'

export type GardenAccount = {
  asset: GardenAssetId
  owner: string
  amount: string
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

export type GardenAssetInfo = {
  id: string
  min_amount: string
  max_amount: string
}

export type GardenAssetsResponse = GardenResponseEnvelope<GardenAssetInfo[]>

export type GardenOrderRequest = {
  source: GardenAccount
  destination: GardenAccount
  solver_id?: string
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
  approval_transaction: GardenStarknetCall | null
  initiate_transaction: GardenStarknetCall
}

export type GardenEvmTransactionData = {
  chain_id: number
  data: string
  to: string
  value: string
}

export type GardenEvmInitiateResult = {
  order_id: string
  approval_transaction: GardenEvmTransactionData
  initiate_transaction: GardenEvmTransactionData
}

export type GardenCreateOrderResult =
  | GardenBitcoinInitiateResult
  | GardenStarknetInitiateResult
  | GardenEvmInitiateResult

export type GardenCreateOrderResponse = GardenResponseEnvelope<GardenCreateOrderResult>

export const isGardenBitcoinInitiate = (
  result: GardenCreateOrderResult,
): result is GardenBitcoinInitiateResult =>
  typeof result === 'object' &&
  result !== null &&
  typeof (result as GardenBitcoinInitiateResult).order_id === 'string' &&
  typeof (result as GardenBitcoinInitiateResult).to === 'string' &&
  typeof (result as GardenBitcoinInitiateResult).amount === 'string'

export const isGardenStarknetInitiate = (
  result: GardenCreateOrderResult,
): result is GardenStarknetInitiateResult => {
  if (typeof result !== 'object' || result === null) return false
  if (typeof (result as GardenStarknetInitiateResult).order_id !== 'string') return false
  if (!('initiate_transaction' in result)) return false
  const initiate = (result as GardenStarknetInitiateResult).initiate_transaction
  return (
    typeof initiate === 'object' &&
    initiate !== null &&
    typeof (initiate as GardenStarknetCall).to === 'string' &&
    typeof (initiate as GardenStarknetCall).selector === 'string' &&
    Array.isArray((initiate as GardenStarknetCall).calldata)
  )
}

export const isGardenEvmInitiate = (
  result: GardenCreateOrderResult,
): result is GardenEvmInitiateResult => {
  if (typeof result !== 'object' || result === null) return false
  if (typeof (result as GardenEvmInitiateResult).order_id !== 'string') return false
  if (!('initiate_transaction' in result)) return false
  const initiate = (result as GardenEvmInitiateResult).initiate_transaction
  return (
    typeof initiate === 'object' &&
    initiate !== null &&
    typeof (initiate as GardenEvmTransactionData).chain_id === 'number' &&
    typeof (initiate as GardenEvmTransactionData).to === 'string' &&
    typeof (initiate as GardenEvmTransactionData).data === 'string' &&
    typeof (initiate as GardenEvmTransactionData).value === 'string'
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
  affiliate_fees: GardenAffiliateFeeEntry[]
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
    allowanceContract: string
  }
}
