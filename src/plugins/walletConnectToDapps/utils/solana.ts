import { VersionedTransaction } from '@solana/web3.js'

const KNOWN_PROGRAMS: Record<string, string> = {
  '11111111111111111111111111111111': 'System Program',
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'Token Program',
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: 'Associated Token Program',
  ComputeBudget111111111111111111111111111111: 'Compute Budget',
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter v6',
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca Whirlpool',
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: 'Raydium CLMM',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: 'Meteora DLMM',
}

const INFRA_PROGRAMS = new Set(['Compute Budget', 'Token Program', 'Associated Token Program'])

export type ParsedSolanaInstruction = {
  programId: string
  programName: string | undefined
  accountCount: number
  dataLength: number
}

export type ParsedSolanaTransaction = {
  version: 'legacy' | 0
  feePayer: string
  recentBlockhash: string
  instructions: ParsedSolanaInstruction[]
  primaryProgram: string | undefined
  primaryProgramId: string | undefined
}

export const parseSolanaTransaction = (base64: string): ParsedSolanaTransaction | null => {
  try {
    const buf = Buffer.from(base64, 'base64')
    const tx = VersionedTransaction.deserialize(buf)
    const { message } = tx

    const feePayer = message.staticAccountKeys[0]?.toBase58() ?? ''
    const recentBlockhash = message.recentBlockhash

    const instructions: ParsedSolanaInstruction[] = message.compiledInstructions.map(ix => {
      const programKey = message.staticAccountKeys[ix.programIdIndex]
      const programId = programKey?.toBase58() ?? ''
      const programName = KNOWN_PROGRAMS[programId]

      return {
        programId,
        programName,
        accountCount: ix.accountKeyIndexes.length,
        dataLength: ix.data.length,
      }
    })

    const primaryInstruction = instructions.find(
      ix => ix.programName && !INFRA_PROGRAMS.has(ix.programName),
    )

    return {
      version: tx.version === 'legacy' ? 'legacy' : 0,
      feePayer,
      recentBlockhash,
      instructions,
      primaryProgram:
        primaryInstruction?.programName ??
        instructions.find(ix => !INFRA_PROGRAMS.has(ix.programName ?? ''))?.programName,
      primaryProgramId:
        primaryInstruction?.programId ??
        instructions.find(ix => !INFRA_PROGRAMS.has(ix.programName ?? ''))?.programId,
    }
  } catch {
    return null
  }
}
