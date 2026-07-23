import type { TransactionInstruction } from '@solana/web3.js'
import { ComputeBudgetProgram } from '@solana/web3.js'

export const isComputeBudgetInstruction = (instruction: TransactionInstruction): boolean =>
  instruction.programId.toString() === ComputeBudgetProgram.programId.toString()

// Transaction data carries business instructions only - the execution compute budget is derived fresh
export const omitComputeBudgetInstructions = (
  instructions: TransactionInstruction[],
): TransactionInstruction[] => instructions.filter(instruction => !isComputeBudgetInstruction(instruction))
