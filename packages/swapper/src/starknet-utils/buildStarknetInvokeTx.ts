import type { starknet } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { hash, num } from 'starknet'

export const toHexString = (value: unknown): string => {
  const strValue = String(value)
  if (strValue.startsWith('0x')) return strValue
  if (/^[0-9a-fA-F]+$/.test(strValue) && /[a-fA-F]/.test(strValue)) {
    return `0x${strValue}`
  }
  try {
    return num.toHex(strValue)
  } catch {
    return `0x${strValue}`
  }
}

type StarknetEstimateResult = {
  result?: {
    l1_gas_consumed?: string
    l1_gas_price?: string
    l2_gas_consumed?: string
    l2_gas_price?: string
    l1_data_gas_consumed?: string
    l1_data_gas_price?: string
  }[]
  error?: unknown
}

export const buildStarknetInvokeTx = async ({
  formattedCalldata,
  normalizedFrom,
  accountNumber,
  adapter,
}: {
  formattedCalldata: string[]
  normalizedFrom: string
  accountNumber: number
  adapter: starknet.ChainAdapter
}) => {
  const chainIdHex = await adapter.getStarknetProvider().getChainId()
  const nonce = await adapter.getNonce(normalizedFrom)

  const version = '0x3' as const
  const estimateTx = {
    type: 'INVOKE',
    version,
    sender_address: normalizedFrom,
    calldata: formattedCalldata,
    signature: [],
    nonce,
    resource_bounds: {
      l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x5f5e100' },
      l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
      l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
    },
    tip: '0x0',
    paymaster_data: [],
    account_deployment_data: [],
    nonce_data_availability_mode: 'L1',
    fee_data_availability_mode: 'L1',
  }

  const estimateResponse = await adapter
    .getStarknetProvider()
    .fetch('starknet_estimateFee', [[estimateTx], ['SKIP_VALIDATE'], 'latest'])
  const estimateResult: StarknetEstimateResult = await estimateResponse.json()

  if (estimateResult.error) {
    throw new Error(`Fee estimation failed: ${JSON.stringify(estimateResult.error)}`)
  }

  const feeEstimate = estimateResult.result?.[0]
  if (!feeEstimate) {
    throw new Error('Fee estimation failed: no estimate returned')
  }

  const l1GasConsumed = feeEstimate.l1_gas_consumed
    ? BigInt(feeEstimate.l1_gas_consumed)
    : BigInt('0x186a0')
  const l1GasPrice = feeEstimate.l1_gas_price
    ? BigInt(feeEstimate.l1_gas_price)
    : BigInt('0x5f5e100')
  const l2GasConsumed = feeEstimate.l2_gas_consumed
    ? BigInt(feeEstimate.l2_gas_consumed)
    : BigInt('0x0')
  const l2GasPrice = feeEstimate.l2_gas_price ? BigInt(feeEstimate.l2_gas_price) : BigInt('0x0')
  const l1DataGasConsumed = feeEstimate.l1_data_gas_consumed
    ? BigInt(feeEstimate.l1_data_gas_consumed)
    : BigInt('0x186a0')
  const l1DataGasPrice = feeEstimate.l1_data_gas_price
    ? BigInt(feeEstimate.l1_data_gas_price)
    : BigInt('0x1')

  const resourceBounds = {
    l1_gas: {
      max_amount: (l1GasConsumed * BigInt(500)) / BigInt(100),
      max_price_per_unit: (l1GasPrice * BigInt(200)) / BigInt(100),
    },
    l2_gas: {
      max_amount: (l2GasConsumed * BigInt(500)) / BigInt(100),
      max_price_per_unit: (l2GasPrice * BigInt(200)) / BigInt(100),
    },
    l1_data_gas: {
      max_amount: (l1DataGasConsumed * BigInt(500)) / BigInt(100),
      max_price_per_unit: (l1DataGasPrice * BigInt(200)) / BigInt(100),
    },
  }

  const invokeHashInputs = {
    senderAddress: normalizedFrom,
    version,
    compiledCalldata: formattedCalldata,
    chainId: chainIdHex,
    nonce,
    nonceDataAvailabilityMode: 0 as const,
    feeDataAvailabilityMode: 0 as const,
    resourceBounds: {
      l1_gas: {
        max_amount: resourceBounds.l1_gas.max_amount,
        max_price_per_unit: resourceBounds.l1_gas.max_price_per_unit,
      },
      l2_gas: {
        max_amount: resourceBounds.l2_gas.max_amount,
        max_price_per_unit: resourceBounds.l2_gas.max_price_per_unit,
      },
      l1_data_gas: {
        max_amount: resourceBounds.l1_data_gas.max_amount,
        max_price_per_unit: resourceBounds.l1_data_gas.max_price_per_unit,
      },
    },
    tip: '0x0',
    paymasterData: [],
    accountDeploymentData: [],
  }

  const txHash = hash.calculateInvokeTransactionHash(invokeHashInputs)

  return {
    addressNList: toAddressNList(adapter.getBip44Params({ accountNumber })),
    txHash,
    _txDetails: {
      fromAddress: normalizedFrom,
      calldata: formattedCalldata,
      nonce,
      version,
      resourceBounds,
      chainId: chainIdHex,
      nonceDataAvailabilityMode: 0 as const,
      feeDataAvailabilityMode: 0 as const,
      tip: '0x0',
      paymasterData: [],
      accountDeploymentData: [],
    },
  }
}
