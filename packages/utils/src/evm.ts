import type { evm, EvmChainAdapter } from '@shapeshiftoss/chain-adapters'

import { bn, bnOrZero } from './bignumber/bignumber'

export type Fees = evm.Fees & {
  gasLimit: string
  networkFeeCryptoBaseUnit: string
}

export type EvmFees = {
  fees: Fees
  txFeeFiat: string
  networkFeeCryptoBaseUnit: string
}

type CalcNetworkFeeCryptoBaseUnitArgs = evm.FeeData & {
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

type GetFeesArgs = {
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
