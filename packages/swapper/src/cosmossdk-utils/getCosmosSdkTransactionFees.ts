import type { GetUnsignedCosmosSdkTransactionArgs } from '../types'
import { getCosmosSdkExecutionContext } from './getCosmosSdkExecutionContext'

export const getCosmosSdkTransactionFees = async (
  args: GetUnsignedCosmosSdkTransactionArgs,
): Promise<string> => {
  const { feeData } = await getCosmosSdkExecutionContext(args)
  return feeData.txFee
}
