import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { TransactionInstruction } from '@solana/web3.js'

export const ATA_RENT_LAMPORTS = 2040000

// Rent paid to create any associated token accounts the transaction opens (e.g. a first-time
// transfer of an SPL token to a recipient that doesn't yet hold it). Included in reported
// network fees so the displayed cost matches what the payer actually spends.
export const calculateAccountCreationCosts = (instructions: TransactionInstruction[]): string => {
  const ataCreationCount = instructions.filter(
    instruction => instruction.programId.toString() === ASSOCIATED_PROGRAM_ID.toString(),
  ).length

  return bnOrZero(ATA_RENT_LAMPORTS).times(ataCreationCount).toString()
}
