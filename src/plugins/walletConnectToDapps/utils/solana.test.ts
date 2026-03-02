import {
  Keypair,
  MessageV0,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js'
import { assert, describe, expect, it } from 'vitest'

import { parseSolanaTransaction } from './solana'

const makeTransaction = (instructions: TransactionInstruction[], feePayer: PublicKey) => {
  const message = MessageV0.compile({
    payerKey: feePayer,
    instructions,
    recentBlockhash: '11111111111111111111111111111111',
  })
  return new VersionedTransaction(message)
}

const serializeToBase64 = (tx: VersionedTransaction) =>
  Buffer.from(tx.serialize()).toString('base64')

describe('parseSolanaTransaction', () => {
  const feePayerKeypair = Keypair.generate()
  const feePayer = feePayerKeypair.publicKey
  const recipient = Keypair.generate().publicKey

  it('should return null for invalid base64', () => {
    expect(parseSolanaTransaction('not-valid-base64!!')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(parseSolanaTransaction('')).toBeNull()
  })

  it('should return null for non-transaction data', () => {
    const randomData = Buffer.from('hello world').toString('base64')
    expect(parseSolanaTransaction(randomData)).toBeNull()
  })

  it('should parse a system transfer transaction', () => {
    const ix = SystemProgram.transfer({
      fromPubkey: feePayer,
      toPubkey: recipient,
      lamports: 1_000_000,
    })

    const tx = makeTransaction([ix], feePayer)
    const base64 = serializeToBase64(tx)
    const result = parseSolanaTransaction(base64)

    assert(result !== null, 'Expected parsed result')
    expect(result.version).toBe(0)
    expect(result.feePayer).toBe(feePayer.toBase58())
    expect(result.recentBlockhash).toBe('11111111111111111111111111111111')
    expect(result.instructions).toHaveLength(1)
    expect(result.instructions[0].programId).toBe('11111111111111111111111111111111')
    expect(result.instructions[0].programName).toBe('System Program')
    expect(result.instructions[0].accountCount).toBe(2)
    expect(result.primaryProgram).toBe('System Program')
    expect(result.primaryProgramId).toBe('11111111111111111111111111111111')
  })

  it('should identify jupiter as primary program over infra programs', () => {
    const jupiterProgramId = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')
    const computeBudgetProgramId = new PublicKey('ComputeBudget111111111111111111111111111111')

    const computeIx = new TransactionInstruction({
      keys: [],
      programId: computeBudgetProgramId,
      data: Buffer.from([0]),
    })

    const jupiterIx = new TransactionInstruction({
      keys: [
        { pubkey: feePayer, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
      ],
      programId: jupiterProgramId,
      data: Buffer.from([1, 2, 3]),
    })

    const tx = makeTransaction([computeIx, jupiterIx], feePayer)
    const base64 = serializeToBase64(tx)
    const result = parseSolanaTransaction(base64)

    assert(result !== null, 'Expected parsed result')
    expect(result.instructions).toHaveLength(2)
    expect(result.primaryProgram).toBe('Jupiter v6')
    expect(result.primaryProgramId).toBe(jupiterProgramId.toBase58())
  })

  it('should handle unknown programs gracefully', () => {
    const unknownProgram = Keypair.generate().publicKey

    const ix = new TransactionInstruction({
      keys: [{ pubkey: feePayer, isSigner: true, isWritable: true }],
      programId: unknownProgram,
      data: Buffer.from([1]),
    })

    const tx = makeTransaction([ix], feePayer)
    const base64 = serializeToBase64(tx)
    const result = parseSolanaTransaction(base64)

    assert(result !== null, 'Expected parsed result')
    expect(result.instructions[0].programName).toBeUndefined()
    expect(result.instructions[0].programId).toBe(unknownProgram.toBase58())
    expect(result.primaryProgram).toBeUndefined()
    expect(result.primaryProgramId).toBe(unknownProgram.toBase58())
  })

  it('should pick non-infra program as primary when mixed with infra', () => {
    const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    const orcaProgramId = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc')

    const tokenIx = new TransactionInstruction({
      keys: [{ pubkey: feePayer, isSigner: true, isWritable: true }],
      programId: tokenProgramId,
      data: Buffer.from([3]),
    })

    const orcaIx = new TransactionInstruction({
      keys: [
        { pubkey: feePayer, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
      ],
      programId: orcaProgramId,
      data: Buffer.from([1, 2]),
    })

    const tx = makeTransaction([tokenIx, orcaIx], feePayer)
    const base64 = serializeToBase64(tx)
    const result = parseSolanaTransaction(base64)

    assert(result !== null, 'Expected parsed result')
    expect(result.primaryProgram).toBe('Orca Whirlpool')
    expect(result.primaryProgramId).toBe(orcaProgramId.toBase58())
  })

  it('should count accounts and data length correctly', () => {
    const ix = new TransactionInstruction({
      keys: [
        { pubkey: feePayer, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false },
      ],
      programId: SystemProgram.programId,
      data: Buffer.from([1, 2, 3, 4, 5]),
    })

    const tx = makeTransaction([ix], feePayer)
    const base64 = serializeToBase64(tx)
    const result = parseSolanaTransaction(base64)

    assert(result !== null, 'Expected parsed result')
    expect(result.instructions[0].accountCount).toBe(3)
    expect(result.instructions[0].dataLength).toBe(5)
  })
})
