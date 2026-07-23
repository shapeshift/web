import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { bnOrZero } from '@shapeshiftoss/utils'
import BigNumber from 'bignumber.js'

import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { getSolanaExecutionContext } from './getSolanaExecutionContext'

export type SolanaComputeBudgetOptions = {
  marginMultiplier?: number
  minComputeUnits?: number
}

type SolanaTransactionOptions = {
  computeBudget?: SolanaComputeBudgetOptions
}

export const getUnsignedSolanaTransaction = async (
  args: GetUnsignedSolanaTransactionArgs,
  { computeBudget = {} }: SolanaTransactionOptions = {},
): Promise<SolanaSignTx> => {
  const { step, adapter, feeData, transactionData, instructions, includeComputeBudget } =
    await getSolanaExecutionContext(args)

  const { accountNumber } = step
  const { addressLookupTableAddresses } = transactionData
  const { marginMultiplier, minComputeUnits } = computeBudget

  const computeUnitLimit = BigNumber.max(
    bnOrZero(feeData.chainSpecific.computeUnits),
    minComputeUnits ?? 0,
  )

  return adapter.buildSendApiTransaction({
    from: args.from,
    to: '',
    value: '0',
    accountNumber,
    chainSpecific: {
      addressLookupTableAccounts: addressLookupTableAddresses,
      instructions: instructions.map(instruction => adapter.convertInstruction(instruction)),
      ...(includeComputeBudget && {
        computeUnitLimit: computeUnitLimit.times(marginMultiplier ?? 1).toFixed(0),
        computeUnitPrice: feeData.chainSpecific.priorityFee,
      }),
    },
  })
}
