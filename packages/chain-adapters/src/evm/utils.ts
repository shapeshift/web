import { bn, bnOrZero } from '@shapeshiftoss/utils'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'

import type { EvmChainAdapter } from './EvmBaseAdapter'
import type { FeeData, Fees } from './types'

export const getErc20Data = (to: string, value: string, contractAddress?: string): string => {
  if (!contractAddress) return ''

  return encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [getAddress(to), BigInt(value)],
  })
}

type CalcNetworkFeeCryptoBaseUnitArgs = FeeData & {
  supportsEIP1559: boolean
}

export const calcNetworkFeeCryptoBaseUnit = (args: CalcNetworkFeeCryptoBaseUnitArgs) => {
  const {
    supportsEIP1559,
    gasLimit,
    gasPrice,
    l1GasLimit,
    l1GasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = args

  // l1 fee if exists or 0
  const l1Fee = bnOrZero(l1GasPrice).times(bnOrZero(l1GasLimit))

  // eip1559 fees
  if (supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
    return bn(gasLimit).times(maxFeePerGas).plus(l1Fee).toFixed(0)
  }

  // legacy fees
  return bn(gasLimit).times(gasPrice).plus(l1Fee).toFixed(0)
}

export type GetFeesArgs = {
  adapter: EvmChainAdapter
  data: string
  to: string
  value: string
  from: string
  supportsEIP1559: boolean
}

export const getFees = async (args: GetFeesArgs): Promise<Fees> => {
  const { adapter, data, to, value, from, supportsEIP1559 } = args

  const {
    average: { chainSpecific: feeData },
  } = await adapter.getFeeData({ to, value, chainSpecific: { from, data } })

  const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
    ...feeData,
    supportsEIP1559,
  })

  const { gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = feeData

  if (supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
    return { networkFeeCryptoBaseUnit, gasLimit, maxFeePerGas, maxPriorityFeePerGas }
  }

  return { networkFeeCryptoBaseUnit, gasLimit, gasPrice }
}
