import type { TxBuildData } from '../../../types'

export { evmTxBuildData } from '../../utils/toTxBuildData'

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
