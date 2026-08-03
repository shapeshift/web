import { bnOrZero } from '@shapeshiftoss/utils'
import type { TransactionInstruction } from '@solana/web3.js'
import { ComputeBudgetProgram } from '@solana/web3.js'
import BigNumber from 'bignumber.js'

export type SolanaComputeBudgetOptions = {
  marginMultiplier?: number
  minComputeUnits?: number
}

export const isComputeBudgetInstruction = (instruction: TransactionInstruction): boolean =>
  instruction.programId.toString() === ComputeBudgetProgram.programId.toString()

// Provider payloads carry their own budget instructions - strip them so ours are set from
// measured simulation and the payload never carries duplicates (solana rejects them)
export const omitComputeBudgetInstructions = (
  instructions: TransactionInstruction[],
): TransactionInstruction[] =>
  instructions.filter(instruction => !isComputeBudgetInstruction(instruction))

// Quote transaction data carries a static compute unit limit so api consumers can execute
// without simulating - the dynamic priority fee is added at execution time
export const withComputeUnitLimit = ({
  instructions,
  computeUnits,
  includeComputeBudget,
  computeBudget = {},
}: {
  instructions: TransactionInstruction[]
  computeUnits: string
  includeComputeBudget: boolean
  computeBudget?: SolanaComputeBudgetOptions
}): TransactionInstruction[] => {
  // Plain native transfers broadcast without a compute budget
  if (!includeComputeBudget) return instructions

  const { marginMultiplier, minComputeUnits } = computeBudget

  const units = Number(
    BigNumber.max(bnOrZero(computeUnits), minComputeUnits ?? 0)
      .times(marginMultiplier ?? 1)
      .toFixed(0),
  )

  return [...instructions, ComputeBudgetProgram.setComputeUnitLimit({ units })]
}
