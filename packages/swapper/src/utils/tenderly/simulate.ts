import type { Asset } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import axios from 'axios'
import type { Address, Hex } from 'viem'
import { isAddress, maxUint256, toHex } from 'viem'

import { isNativeEvmAsset } from '../../swappers/utils/helpers/helpers'
import {
  getAllowanceStorageSlot,
  getBalanceStorageSlot,
  getMaxBalanceValue,
  getTokenAllowanceSlot,
  getTokenBalanceSlot,
} from './storageSlots'
import type {
  TenderlyConfig,
  TenderlyErrorResponse,
  TenderlySimulationRequest,
  TenderlySimulationResponse,
  TenderlyStateOverrides,
} from './types'

/**
 * Result of a Tenderly simulation with state overrides
 */
export type SimulationResult = {
  /** Whether the simulation succeeded */
  success: boolean
  /** Gas used by the transaction */
  gasUsed: bigint
  /** Recommended gas limit (with buffer) */
  gasLimit: bigint
  /** Error message if simulation failed */
  errorMessage?: string
}

/**
 * Parameters for simulating a transaction with state overrides
 */
export type SimulateTransactionParams = {
  /** Chain ID (as number, e.g., 1 for Ethereum, 42161 for Arbitrum) */
  chainId: number
  /** Transaction sender address */
  from: Address
  /** Transaction recipient address (the contract being called) */
  to: Address
  /** Transaction calldata */
  data: Hex
  /** Transaction value (for native asset transfers) */
  value?: string | bigint
  /** Asset being sold (to determine override strategy) */
  sellAsset: Asset
  /** Amount being sold in base units */
  sellAmount: string | bigint
  /** Spender address for allowance overrides (optional, defaults to 'to') */
  spenderAddress?: Address
}

/**
 * Simulate a transaction using Tenderly's API with state overrides.
 * This allows accurate gas estimation even when the user lacks sufficient balance or approvals.
 *
 * @param params - Transaction parameters and asset info
 * @param config - Tenderly API configuration
 * @returns Simulation result with gas estimates
 *
 * @example
 * const result = await simulateWithStateOverrides({
 *   chainId: 42161,
 *   from: '0xUserAddress',
 *   to: '0xUSDCContract',
 *   data: '0x...',
 *   value: '0',
 *   sellAsset: usdcAsset,
 *   sellAmount: '10000000', // 10 USDC
 * }, tenderlyConfig)
 *
 * if (result.success) {
 *   console.log(`Gas estimate: ${result.gasLimit}`)
 * }
 */
export async function simulateWithStateOverrides(
  params: SimulateTransactionParams,
  config: TenderlyConfig,
): Promise<SimulationResult> {
  const { chainId, from, to, data, value, sellAsset, sellAmount, spenderAddress } = params

  try {
    // Validate inputs
    if (!isAddress(from)) {
      throw new Error(`Invalid from address: ${from}`)
    }
    if (!isAddress(to)) {
      throw new Error(`Invalid to address: ${to}`)
    }

    // Build state overrides
    // Use spenderAddress if provided for allowance, otherwise default to 'to'
    const spender = spenderAddress ?? to

    const stateOverrides = buildStateOverrides({
      from,
      spender,
      sellAsset,
      sellAmount,
    })

    // Build Tenderly simulation request
    const request: TenderlySimulationRequest = {
      network_id: chainId.toString(),
      from: from.toLowerCase() as Address,
      to: to.toLowerCase() as Address,
      input: data,
      value: value ? toHex(BigInt(value)) : '0x0',
      save: false,
      save_if_fails: true,
      state_objects: stateOverrides,
    }

    // Call Tenderly simulation API
    const url = `https://api.tenderly.co/api/v1/account/${config.accountSlug}/project/${config.projectSlug}/simulate`

    const response = await axios.post<TenderlySimulationResponse | TenderlyErrorResponse>(
      url,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': config.apiKey,
        },
        timeout: 10000, // 10 second timeout
      },
    )

    // Check for API errors
    if ('error' in response.data) {
      const error = response.data.error
      return {
        success: false,
        gasUsed: 0n,
        gasLimit: 0n,
        errorMessage: `Tenderly API error: ${error.message}`,
      }
    }

    // Extract simulation results
    const { transaction } = response.data
    const gasUsed = BigInt(transaction.gas_used)

    // Add 10% buffer to gas estimate
    const gasLimit = (gasUsed * 11n) / 10n

    return {
      success: transaction.status,
      gasUsed,
      gasLimit,
      errorMessage: transaction.error_message,
    }
  } catch (error) {
    return {
      success: false,
      gasUsed: 0n,
      gasLimit: 0n,
      errorMessage: error instanceof Error ? error.message : 'Unknown simulation error',
    }
  }
}

/**
 * Build state overrides for the simulation.
 * Overrides user balance and allowances to ensure the transaction can succeed.
 *
 * For native assets: Override ETH/native balance
 * For ERC20 tokens: Override token balance AND allowance in contract storage
 */
function buildStateOverrides(params: {
  from: Address
  spender: Address
  sellAsset: Asset
  sellAmount: string | bigint
}): TenderlyStateOverrides {
  const { from, spender, sellAsset } = params
  const stateOverrides: TenderlyStateOverrides = {}

  // Always give user plenty of native asset for gas
  const nativeBalanceOverride = toHex(maxUint256 >> 10n) // Very large balance for gas

  // Check if we're selling a native asset or ERC20
  const isNative = isNativeEvmAsset(sellAsset.assetId)

  if (isNative) {
    // Native asset: Just override the user's ETH balance
    stateOverrides[from.toLowerCase() as Address] = {
      balance: nativeBalanceOverride,
    }
  } else {
    // ERC20 token: Override both native balance (for gas) and token balance
    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

    if (!contractAddress) {
      // Fallback: just override native balance
      stateOverrides[from.toLowerCase() as Address] = {
        balance: nativeBalanceOverride,
      }
      return stateOverrides
    }

    // Override user's native balance for gas
    stateOverrides[from.toLowerCase() as Address] = {
      balance: nativeBalanceOverride,
    }

    // Override user's token balance in the contract storage
    const balanceSlot = getTokenBalanceSlot(contractAddress as Address)
    const balanceStorageSlot = getBalanceStorageSlot(from, balanceSlot)
    const maxBalance = getMaxBalanceValue(contractAddress as Address)

    // Override user's token allowance for the spender
    const allowanceSlot = getTokenAllowanceSlot(contractAddress as Address)
    const allowanceStorageSlot = getAllowanceStorageSlot(from, spender, allowanceSlot)

    stateOverrides[contractAddress.toLowerCase() as Address] = {
      storage: {
        [balanceStorageSlot]: maxBalance,
        [allowanceStorageSlot]: toHex(maxUint256), // Max allowance
      },
    }
  }

  return stateOverrides
}
