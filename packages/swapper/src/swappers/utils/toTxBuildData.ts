import type { TxBuildData } from '../../types'

export const evmTxBuildData = (params: {
  chainId: number
  to: string
  data: string
  value: string
  gasLimit?: string
}): Extract<TxBuildData, { type: 'evm' }> => ({
  type: 'evm',
  chainId: params.chainId,
  to: params.to,
  data: params.data,
  value: params.value,
  gasLimit: params.gasLimit,
})
