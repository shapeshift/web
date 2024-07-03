import type { evm, EvmChainId, FeeDataEstimate } from '@shapeshiftoss/chain-adapters'

export const gasFeeData: evm.GasFeeDataEstimate = {
  fast: {
    gasPrice: '79036500000',
    maxFeePerGas: '216214758112',
    maxPriorityFeePerGas: '2982734547',
  },
  slow: {
    gasPrice: '79036500000',
    maxFeePerGas: '216214758112',
    maxPriorityFeePerGas: '2982734547',
  },
  average: {
    gasPrice: '79036500000',
    maxFeePerGas: '216214758112',
    maxPriorityFeePerGas: '2982734547',
  },
}

export const feeData: FeeDataEstimate<EvmChainId> = {
  fast: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      ...gasFeeData.fast,
    },
  },
  average: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      ...gasFeeData.average,
    },
  },
  slow: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      ...gasFeeData.slow,
    },
  },
}
