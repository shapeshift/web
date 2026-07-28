import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { isComputeBudgetInstruction } from './computeBudgetInstructions'
import { getSolanaExecutionContext } from './getSolanaExecutionContext'

// Quote instructions carry the static compute unit limit - only the dynamic priority fee is
// fetched here, mirroring evm's quote-time gas limit + execution-time gas price split
export const getUnsignedSolanaTransaction = async (
  args: GetUnsignedSolanaTransactionArgs,
): Promise<SolanaSignTx> => {
  const { step, adapter, transactionData } = getSolanaExecutionContext(args)

  const { accountNumber } = step
  const { instructions, addressLookupTableAddresses } = transactionData

  // Plain native transfers carry no compute budget and broadcast without one
  const includeComputeBudget = instructions.some(isComputeBudgetInstruction)
  const priorityFees = includeComputeBudget ? await adapter.getPriorityFees() : undefined

  return adapter.buildSendApiTransaction({
    from: args.from,
    to: '',
    value: '0',
    accountNumber,
    chainSpecific: {
      addressLookupTableAccounts: addressLookupTableAddresses,
      instructions: instructions.map(instruction => adapter.convertInstruction(instruction)),
      ...(priorityFees && { computeUnitPrice: priorityFees.fast }),
    },
  })
}
