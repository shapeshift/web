import type { GetUnsignedUtxoTransactionArgs } from '../types'
import { getUtxoExecutionContext } from './getUtxoExecutionContext'

export const getUtxoTransactionFees = async (
  args: GetUnsignedUtxoTransactionArgs,
): Promise<string> => {
  const { feeData } = await getUtxoExecutionContext(args)
  return feeData.txFee
}
