import type { solana } from '@shapeshiftoss/chain-adapters'
import { bn } from '@shapeshiftoss/utils'
import type { TransactionInstruction } from '@solana/web3.js'
import { ComputeBudgetProgram, SystemProgram } from '@solana/web3.js'

import { calculateAccountCreationCosts } from './calculateAccountCreationCosts'
import { isComputeBudgetInstruction } from './computeBudgetInstructions'

const MAX_COMPUTE_UNITS = 1_400_000

type GetSolanaNetworkFeeCryptoBaseUnitArgs = {
  adapter: solana.ChainAdapter
  from: string
  instructions: TransactionInstruction[]
  addressLookupTableAddresses?: string[]
  tokenId?: string
}

export const getSolanaNetworkFeeCryptoBaseUnit = async ({
  adapter,
  from,
  instructions,
  addressLookupTableAddresses = [],
  tokenId,
}: GetSolanaNetworkFeeCryptoBaseUnitArgs) => {
  // Plain native transfers broadcast without a compute budget (matching wallet sends); anything
  // else includes one - token transfers (tokenId covers native shape estimations), memos, swaps
  const includeComputeBudget =
    Boolean(tokenId) ||
    instructions.some(instruction => !instruction.programId.equals(SystemProgram.programId))

  const hasComputeBudgetInstructions = instructions.some(isComputeBudgetInstruction)

  const estimationInstructions =
    includeComputeBudget && !hasComputeBudgetInstructions
      ? [
          ComputeBudgetProgram.setComputeUnitLimit({ units: MAX_COMPUTE_UNITS }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0 }),
          ...instructions,
        ]
      : instructions

  const { fast } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: addressLookupTableAddresses,
      instructions: estimationInstructions,
    },
  })

  // Rent for any token account creation in the instructions is part of what the payer spends
  const networkFeeCryptoBaseUnit = bn(fast.txFee)
    .plus(calculateAccountCreationCosts(instructions))
    .toString()

  return { networkFeeCryptoBaseUnit, feeData: fast, includeComputeBudget }
}
