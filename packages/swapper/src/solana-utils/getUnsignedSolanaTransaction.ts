import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { bnOrZero, isToken } from '@shapeshiftoss/utils'
import BigNumber from 'bignumber.js'

import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { getSolanaExecutionContext } from './getSolanaExecutionContext'

export type SolanaComputeBudgetOptions = {
  marginMultiplier?: number
  minComputeUnits?: number
  skipForNativeSend?: boolean
}

export const getUnsignedSolanaTransaction = async (
  args: GetUnsignedSolanaTransactionArgs,
  computeBudget: SolanaComputeBudgetOptions = {},
): Promise<SolanaSignTx> => {
  const { step, adapter, feeData, transactionData } = await getSolanaExecutionContext(args)

  const { accountNumber, sellAsset } = step
  const { instructions, addressLookupTableAddresses } = transactionData
  const { marginMultiplier, minComputeUnits, skipForNativeSend } = computeBudget

  const computeUnitLimit = BigNumber.max(
    bnOrZero(feeData.chainSpecific.computeUnits),
    minComputeUnits ?? 0,
  )

  // Simple native transfers don't need a compute budget; everything else opts into one
  const includeComputeBudget = !skipForNativeSend || isToken(sellAsset.assetId)

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
