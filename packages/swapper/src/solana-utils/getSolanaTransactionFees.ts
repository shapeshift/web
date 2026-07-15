import { bnOrZero } from '@shapeshiftoss/utils'
import BigNumber from 'bignumber.js'

import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { calculateAccountCreationCosts } from './calculateAccountCreationCosts'
import { getSolanaExecutionContext } from './getSolanaExecutionContext'
import type { SolanaComputeBudgetOptions } from './getUnsignedSolanaTransaction'

type SolanaTransactionFeesOptions = {
  computeBudget?: SolanaComputeBudgetOptions
  includeAtaCreationRent?: boolean
}

export const getSolanaTransactionFees = async (
  args: GetUnsignedSolanaTransactionArgs,
  { computeBudget, includeAtaCreationRent }: SolanaTransactionFeesOptions = {},
): Promise<string> => {
  const { feeData, transactionData } = await getSolanaExecutionContext(args)

  if (!computeBudget && !includeAtaCreationRent) return feeData.txFee

  const computeUnits = bnOrZero(feeData.chainSpecific.computeUnits)

  const feeScale = computeUnits.gt(0)
    ? BigNumber.max(computeUnits, computeBudget?.minComputeUnits ?? 0)
        .times(computeBudget?.marginMultiplier ?? 1)
        .div(computeUnits)
    : bnOrZero(1)

  const ataCreationRent = includeAtaCreationRent
    ? calculateAccountCreationCosts(transactionData.instructions)
    : 0

  return bnOrZero(feeData.txFee).times(feeScale).plus(ataCreationRent).toFixed(0)
}
