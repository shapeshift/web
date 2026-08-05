import type { GetUnsignedEvmTransactionArgs } from '../../types'
import { getEvmExecutionContext } from './getEvmExecutionContext'

export const getEvmTransactionFees = async (
  args: GetUnsignedEvmTransactionArgs,
): Promise<string> => {
  const { feeData } = await getEvmExecutionContext(args)
  return feeData.networkFeeCryptoBaseUnit
}
