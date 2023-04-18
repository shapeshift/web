import { Contract } from '@ethersproject/contracts'

import { bn, bnOrZero } from '../utils'
import erc20Abi from './erc20Abi.json'
import type { GasFeeDataEstimate } from './types'

export const getErc20Data = async (
  to: string,
  value: string,
  contractAddress?: string,
): Promise<string> => {
  if (!contractAddress) return ''
  const erc20Contract = new Contract(contractAddress, erc20Abi)
  const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value)
  return callData || ''
}

type Eip1559GasPrice = {
  fast?: string
  average?: string
  slow?: string
}

// calculate eip1559 gas price (baseFee + maxPriorityFeePerGas)
// calculate baseFee ((maxFeePerGas - maxPriorityFeePerGas) / 2) as defined by ethers
// https://github.com/ethers-io/ethers.js/blob/v5.7.2/packages/abstract-provider/src.ts/index.ts#L253
export const getEip1559GasPrice = ({
  fast,
  average,
  slow,
}: GasFeeDataEstimate): Eip1559GasPrice => ({
  fast:
    fast.maxFeePerGas && fast.maxPriorityFeePerGas
      ? bnOrZero(fast.maxFeePerGas)
          .minus(bnOrZero(fast.maxPriorityFeePerGas))
          .div(2)
          .plus(fast.maxPriorityFeePerGas)
          .toFixed(0)
      : undefined,
  average:
    average.maxFeePerGas && average.maxPriorityFeePerGas
      ? bnOrZero(average.maxFeePerGas)
          .minus(bnOrZero(average.maxPriorityFeePerGas))
          .div(2)
          .plus(average.maxPriorityFeePerGas)
          .toFixed(0)
      : undefined,
  slow:
    slow.maxFeePerGas && slow.maxPriorityFeePerGas
      ? bnOrZero(slow.maxFeePerGas)
          .minus(bnOrZero(slow.maxPriorityFeePerGas))
          .div(2)
          .plus(slow.maxPriorityFeePerGas)
          .toFixed(0)
      : undefined,
})

export const getTxFee = (
  gasLimit: string,
  legacyGasPrice: string,
  eip1559GasPrice?: string,
): string => {
  // use worst case gas price for txFee
  const gasPrice =
    eip1559GasPrice && bnOrZero(eip1559GasPrice).gt(legacyGasPrice)
      ? eip1559GasPrice
      : legacyGasPrice
  return bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
}
