import { solAssetId } from '@shapeshiftoss/caip'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Keypair, MessageV0, PublicKey, SystemProgram, VersionedTransaction } from '@solana/web3.js'
import type { Mock } from 'vitest'
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'

import { simulateSolanaTransaction } from './index'

const mockSelectAssetById = vi.fn()

vi.mock('@/state/slices/selectors', async () => {
  const actual = await vi.importActual('@/state/slices/selectors')
  return {
    ...actual,
    selectAssetById: (...args: unknown[]) => mockSelectAssetById(...args),
  }
})

vi.mock('@/state/store', () => ({
  store: {
    getState: vi.fn(() => ({})),
  },
}))

const feePayerKeypair = Keypair.generate()
const feePayer = feePayerKeypair.publicKey
const recipient = Keypair.generate().publicKey

const makeBase64Tx = () => {
  const message = MessageV0.compile({
    payerKey: feePayer,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: feePayer,
        toPubkey: recipient,
        lamports: 1_000_000,
      }),
    ],
    recentBlockhash: '11111111111111111111111111111111',
  })
  const tx = new VersionedTransaction(message)
  return Buffer.from(tx.serialize()).toString('base64')
}

const makeMockConnection = (overrides?: {
  preAccountInfos?: (object | null)[]
  simulationResult?: object
}) => {
  const defaultPreInfos = [
    { lamports: 10_000_000_000, owner: SystemProgram.programId, data: Buffer.alloc(0) },
    { lamports: 5_000_000_000, owner: SystemProgram.programId, data: Buffer.alloc(0) },
    null,
  ]

  const systemProgramAddress = SystemProgram.programId.toBase58()

  const defaultSimResult = {
    value: {
      err: null,
      unitsConsumed: 150,
      accounts: [
        {
          lamports: 9_998_995_000,
          owner: systemProgramAddress,
          data: ['', 'base64'],
          executable: false,
          rentEpoch: 0,
        },
        {
          lamports: 6_000_000_000,
          owner: systemProgramAddress,
          data: ['', 'base64'],
          executable: false,
          rentEpoch: 0,
        },
        {
          lamports: 1,
          owner: 'NativeLoader1111111111111111111111111111111',
          data: ['', 'base64'],
          executable: true,
          rentEpoch: 0,
        },
      ],
    },
  }

  return {
    getMultipleAccountsInfo: vi
      .fn()
      .mockResolvedValue(overrides?.preAccountInfos ?? defaultPreInfos),
    simulateTransaction: vi.fn().mockResolvedValue(overrides?.simulationResult ?? defaultSimResult),
  } as unknown as Parameters<typeof simulateSolanaTransaction>[0]
}

describe('simulateSolanaTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectAssetById.mockImplementation((_state: unknown, assetId: string) => {
      if (assetId === solAssetId) {
        return {
          symbol: 'SOL',
          name: 'Solana',
          icon: 'https://sol.icon',
          precision: 9,
        }
      }
      return undefined
    })
  })

  it('should return null for invalid base64', async () => {
    const connection = makeMockConnection()
    const result = await simulateSolanaTransaction(connection, 'not-valid!!')
    expect(result).toBeNull()
  })

  it('should detect SOL balance decrease on fee payer as send', async () => {
    const base64 = makeBase64Tx()
    const connection = makeMockConnection()
    const result = await simulateSolanaTransaction(connection, base64)

    assert(result !== null, 'Expected simulation result')
    expect(result.success).toBe(true)
    expect(result.unitsConsumed).toBe(150)

    const solChange = result.balanceChanges.find(c => c.isNativeAsset)
    assert(solChange !== undefined, 'Expected SOL balance change')
    expect(solChange.type).toBe('send')
    expect(solChange.tokenInfo.symbol).toBe('SOL')
    expect(Number(solChange.amount)).toBeGreaterThan(0)
  })

  it('should return simulation error when tx fails', async () => {
    const base64 = makeBase64Tx()
    const connection = makeMockConnection({
      simulationResult: {
        value: {
          err: { InstructionError: [0, 'InsufficientFunds'] },
          unitsConsumed: 50,
          accounts: null,
        },
      },
    })

    const result = await simulateSolanaTransaction(connection, base64)

    assert(result !== null, 'Expected simulation result')
    expect(result.success).toBe(false)
    expect(result.error).toContain('InsufficientFunds')
    expect(result.balanceChanges).toHaveLength(0)
  })

  it('should return empty balance changes when no post accounts', async () => {
    const base64 = makeBase64Tx()
    const connection = makeMockConnection({
      simulationResult: {
        value: {
          err: null,
          unitsConsumed: 100,
          accounts: null,
        },
      },
    })

    const result = await simulateSolanaTransaction(connection, base64)

    assert(result !== null, 'Expected simulation result')
    expect(result.success).toBe(true)
    expect(result.balanceChanges).toHaveLength(0)
  })

  it('should detect SPL token balance changes', async () => {
    const tokenMint = Keypair.generate().publicKey
    const tokenAccountOwner = feePayer

    const encodeTokenAccount = (amount: bigint) => {
      const data = Buffer.alloc(165)
      data.set(tokenMint.toBytes(), 0)
      data.set(tokenAccountOwner.toBytes(), 32)
      data.writeBigUInt64LE(amount, 64)
      return data
    }

    const preAmount = 1_000_000n
    const postAmount = 500_000n
    const preData = encodeTokenAccount(preAmount)
    const postData = encodeTokenAccount(postAmount)

    const tokenProgramId = TOKEN_PROGRAM_ID.toBase58()

    const connection = makeMockConnection({
      preAccountInfos: [
        { lamports: 10_000_000_000, owner: SystemProgram.programId, data: Buffer.alloc(0) },
        { lamports: 2_039_280, owner: new PublicKey(tokenProgramId), data: preData },
        null,
      ],
      simulationResult: {
        value: {
          err: null,
          unitsConsumed: 200,
          accounts: [
            {
              lamports: 10_000_000_000,
              owner: SystemProgram.programId.toBase58(),
              data: ['', 'base64'],
              executable: false,
              rentEpoch: 0,
            },
            {
              lamports: 2_039_280,
              owner: tokenProgramId,
              data: [postData.toString('base64'), 'base64'],
              executable: false,
              rentEpoch: 0,
            },
            {
              lamports: 1,
              owner: 'NativeLoader1111111111111111111111111111111',
              data: ['', 'base64'],
              executable: true,
              rentEpoch: 0,
            },
          ],
        },
      },
    })

    mockSelectAssetById.mockImplementation((_state: unknown, assetId: string) => {
      if (assetId === solAssetId) {
        return { symbol: 'SOL', name: 'Solana', icon: '', precision: 9 }
      }
      if (assetId.includes(tokenMint.toBase58())) {
        return { symbol: 'USDC', name: 'USD Coin', icon: 'https://usdc.icon', precision: 6 }
      }
      return undefined
    })

    const result = await simulateSolanaTransaction(connection, makeBase64Tx())

    assert(result !== null, 'Expected simulation result')
    expect(result.success).toBe(true)

    const tokenChange = result.balanceChanges.find(c => !c.isNativeAsset)
    assert(tokenChange !== undefined, 'Expected token balance change')
    expect(tokenChange.type).toBe('send')
    expect(tokenChange.tokenInfo.symbol).toBe('USDC')
  })

  it('should handle string simulation error', async () => {
    const base64 = makeBase64Tx()
    const connection = makeMockConnection({
      simulationResult: {
        value: {
          err: 'AccountNotFound',
          unitsConsumed: 0,
          accounts: null,
        },
      },
    })

    const result = await simulateSolanaTransaction(connection, base64)

    assert(result !== null, 'Expected simulation result')
    expect(result.success).toBe(false)
    expect(result.error).toBe('AccountNotFound')
  })

  it('should call connection methods with correct params', async () => {
    const base64 = makeBase64Tx()
    const connection = makeMockConnection()
    await simulateSolanaTransaction(connection, base64)

    expect(
      (connection.getMultipleAccountsInfo as Mock).mock.calls[0][0].map((k: PublicKey) =>
        k.toBase58(),
      ),
    ).toContain(feePayer.toBase58())

    const simCall = (connection.simulateTransaction as Mock).mock.calls[0]
    expect(simCall[1]).toEqual(
      expect.objectContaining({
        replaceRecentBlockhash: true,
        accounts: expect.objectContaining({
          encoding: 'base64',
        }),
      }),
    )
  })
})
