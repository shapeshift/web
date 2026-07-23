import { bnOrZero } from '@shapeshiftoss/utils'

import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { calculateAccountCreationCosts } from './calculateAccountCreationCosts'
import { getSolanaExecutionContext } from './getSolanaExecutionContext'
import type { SolanaComputeBudgetOptions } from './getUnsignedSolanaTransaction'

type SolanaTransactionFeesOptions = {
  computeBudget?: SolanaComputeBudgetOptions
}

export const getSolanaTransactionFees = async (
  args: GetUnsignedSolanaTransactionArgs,
  { computeBudget }: SolanaTransactionFeesOptions = {},
): Promise<string> => {
  const { feeData, transactionData } = await getSolanaExecutionContext(args)

  // Rent for any token account creation in the instructions is part of what the payer spends
  return bnOrZero(feeData.txFee)
    .times(computeBudget?.marginMultiplier ?? 1)
    .plus(calculateAccountCreationCosts(transactionData.instructions))
    .toFixed(0)
}
