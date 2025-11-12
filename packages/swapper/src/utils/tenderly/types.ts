import type { Address, Hex } from 'viem'

export type TenderlyStateOverrides = {
  [address: Address]: {
    balance?: Hex
    storage?: {
      [slot: Hex]: Hex
    }
  }
}

export type TenderlySimulationRequest = {
  network_id: string
  from: Address
  to: Address
  input: Hex
  value?: Hex
  gas?: number
  gas_price?: string
  max_fee_per_gas?: string
  max_priority_fee_per_gas?: string
  save?: boolean
  save_if_fails?: boolean
  state_objects?: TenderlyStateOverrides
}

export type TenderlySimulationResponse = {
  transaction: {
    hash: string
    status: boolean
    error_message?: string
    gas_used: number
    gas: number
    gas_price: string
    value: string
    call_trace?: unknown[]
    asset_changes?: unknown[]
  }
  simulation: {
    id: string
    network_id: string
    block_number: number
    block_hash: string
    timestamp: string
    gas_used: number
    status: boolean
  }
}

export type TenderlyErrorResponse = {
  error: {
    id: string
    slug: string
    message: string
  }
}

export type TenderlyConfig = {
  apiKey: string
  accountSlug: string
  projectSlug: string
}
