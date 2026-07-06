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

export const utxoTxBuildData = (params: {
  to: string
  opReturnData: string
  value: string
}): Extract<TxBuildData, { type: 'utxo' }> => ({
  type: 'utxo',
  depositAddress: params.to,
  memo: params.opReturnData,
  value: params.value,
})
