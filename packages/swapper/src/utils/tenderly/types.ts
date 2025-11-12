import type { Address, Hex } from 'viem'

/**
 * State overrides for Tenderly simulation.
 * Allows modifying account balances and contract storage during simulation.
 */
export type TenderlyStateOverrides = {
  [address: Address]: {
    /**
     * Override the account's native token balance (ETH, MATIC, etc.)
     * Value in hex format, e.g., "0x56BC75E2D63100000" for 100 ETH
     */
    balance?: Hex
    /**
     * Override specific storage slots in the contract.
     * Key: storage slot (hex), Value: override value (hex)
     */
    storage?: {
      [slot: Hex]: Hex
    }
  }
}

/**
 * Request body for Tenderly simulation API
 */
export type TenderlySimulationRequest = {
  /** Network ID (chain ID as string) */
  network_id: string
  /** Transaction sender address */
  from: Address
  /** Transaction recipient address */
  to: Address
  /** Transaction calldata */
  input: Hex
  /** Transaction value in hex (optional, defaults to "0x0") */
  value?: Hex
  /** Gas limit for simulation (optional, high default recommended) */
  gas?: number
  /** Gas price in hex (optional, can be "0" for simulation) */
  gas_price?: string
  /** Max fee per gas for EIP-1559 (optional) */
  max_fee_per_gas?: string
  /** Max priority fee per gas for EIP-1559 (optional) */
  max_priority_fee_per_gas?: string
  /** Whether to save the simulation in Tenderly dashboard */
  save?: boolean
  /** Whether to save even if simulation fails */
  save_if_fails?: boolean
  /** State overrides for simulation */
  state_objects?: TenderlyStateOverrides
}

/**
 * Response from Tenderly simulation API
 */
export type TenderlySimulationResponse = {
  transaction: {
    /** Transaction hash */
    hash: string
    /** Whether transaction succeeded */
    status: boolean
    /** Error message if failed */
    error_message?: string
    /** Gas used by the transaction */
    gas_used: number
    /** Gas limit */
    gas: number
    /** Gas price */
    gas_price: string
    /** Transaction value */
    value: string
    /** Call trace */
    call_trace?: unknown[]
    /** Asset changes */
    asset_changes?: unknown[]
  }
  simulation: {
    /** Simulation ID */
    id: string
    /** Network ID */
    network_id: string
    /** Block number */
    block_number: number
    /** Block hash */
    block_hash: string
    /** Timestamp */
    timestamp: string
    /** Gas used */
    gas_used: number
    /** Whether simulation succeeded */
    status: boolean
  }
}

/**
 * Error response from Tenderly API
 */
export type TenderlyErrorResponse = {
  error: {
    id: string
    slug: string
    message: string
  }
}

/**
 * Configuration for Tenderly API access
 */
export type TenderlyConfig = {
  apiKey: string
  accountSlug: string
  projectSlug: string
}
