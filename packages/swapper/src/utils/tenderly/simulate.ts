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

export type SimulationResult = {
  success: boolean
  gasUsed: bigint
  gasLimit: bigint
  errorMessage?: string
}

export type SimulateTransactionParams = {
  chainId: number
  from: Address
  to: Address
  data: Hex
  value?: string | bigint
  sellAsset: Asset
  sellAmount: string | bigint
  spenderAddress?: Address
}

export async function simulateWithStateOverrides(
  params: SimulateTransactionParams,
  config: TenderlyConfig,
): Promise<SimulationResult> {
  const { chainId, from, to, data, value, sellAsset, sellAmount, spenderAddress } = params

  try {
    if (!isAddress(from)) throw new Error(`Invalid from address: ${from}`)
    if (!isAddress(to)) throw new Error(`Invalid to address: ${to}`)

    const spender = spenderAddress ?? to

    const stateOverrides = buildStateOverrides({
      from,
      spender,
      sellAsset,
      sellAmount,
    })

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

    const url = `https://api.tenderly.co/api/v1/account/${config.accountSlug}/project/${config.projectSlug}/simulate`

    const response = await axios.post<TenderlySimulationResponse | TenderlyErrorResponse>(
      url,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': config.apiKey,
        },
        timeout: 10000,
      },
    )

    if ('error' in response.data) {
      const error = response.data.error
      return {
        success: false,
        gasUsed: 0n,
        gasLimit: 0n,
        errorMessage: `Tenderly API error: ${error.message}`,
      }
    }

    const { transaction } = response.data
    const gasUsed = BigInt(transaction.gas_used)
    const gasLimit = (gasUsed * 11n) / 10n // 10% buffer

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

function buildStateOverrides(params: {
  from: Address
  spender: Address
  sellAsset: Asset
  sellAmount: string | bigint
}): TenderlyStateOverrides {
  const { from, spender, sellAsset } = params
  const stateOverrides: TenderlyStateOverrides = {}
  const nativeBalanceOverride = toHex(maxUint256 >> 10n)
  const isNative = isNativeEvmAsset(sellAsset.assetId)

  if (isNative) {
    stateOverrides[from.toLowerCase() as Address] = {
      balance: nativeBalanceOverride,
    }
  } else {
    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

    if (!contractAddress) {
      stateOverrides[from.toLowerCase() as Address] = {
        balance: nativeBalanceOverride,
      }
      return stateOverrides
    }

    stateOverrides[from.toLowerCase() as Address] = {
      balance: nativeBalanceOverride,
    }

    const balanceSlot = getTokenBalanceSlot(contractAddress as Address)
    const balanceStorageSlot = getBalanceStorageSlot(from, balanceSlot)
    const maxBalance = getMaxBalanceValue(contractAddress as Address)

    const allowanceSlot = getTokenAllowanceSlot(contractAddress as Address)
    const allowanceStorageSlot = getAllowanceStorageSlot(from, spender, allowanceSlot)

    stateOverrides[contractAddress.toLowerCase() as Address] = {
      storage: {
        [balanceStorageSlot]: maxBalance,
        [allowanceStorageSlot]: toHex(maxUint256),
      },
    }
  }

  return stateOverrides
}
