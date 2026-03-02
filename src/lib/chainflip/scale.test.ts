import { bytesToHex } from 'viem'
import { describe, expect, it } from 'vitest'

import {
  encodeAddCollateral,
  encodeAddLenderFunds,
  encodeBatch,
  encodeExpandLoan,
  encodeInitiateVoluntaryLiquidation,
  encodeMakeRepayment,
  encodeNonNativeSignedCall,
  encodeRegisterLiquidityRefundAddress,
  encodeRegisterLpAccount,
  encodeRemoveCollateral,
  encodeRemoveLenderFunds,
  encodeRequestLiquidityDepositAddress,
  encodeRequestLoan,
  encodeStopVoluntaryLiquidation,
  encodeUpdateCollateralTopupAsset,
  encodeWithdrawAsset,
} from './scale'

describe('chainflip scale encoders', () => {
  it('encodes addLenderFunds', () => {
    const encoded = encodeAddLenderFunds({ chain: 'Bitcoin', asset: 'BTC' }, 1)
    expect(encoded).toBe('0x35050501000000000000000000000000000000')
  })

  it('encodes removeLenderFunds', () => {
    const encoded = encodeRemoveLenderFunds({ chain: 'Ethereum', asset: 'ETH' }, null)
    expect(encoded).toBe('0x35060100')
  })

  it('encodes addCollateral', () => {
    const encoded = encodeAddCollateral(null, [
      { asset: { chain: 'Bitcoin', asset: 'BTC' }, amount: 10 },
    ])
    expect(encoded).toBe('0x35070004050a000000000000000000000000000000')
  })

  it('encodes requestLiquidityDepositAddress', () => {
    const encoded = encodeRequestLiquidityDepositAddress({ chain: 'Ethereum', asset: 'ETH' }, 100)
    expect(encoded).toBe('0x1f00016400')
  })

  it('encodes registerLpAccount', () => {
    const encoded = encodeRegisterLpAccount()
    expect(encoded).toBe('0x1f02')
  })

  it('encodes registerLiquidityRefundAddress', () => {
    const encoded = encodeRegisterLiquidityRefundAddress({
      chain: 'Ethereum',
      address: `0x${'11'.repeat(20)}`,
    })

    expect(encoded).toBe(`0x1f0400${'11'.repeat(20)}`)
  })

  it('encodes batch calls', () => {
    const addLenderFunds = encodeAddLenderFunds({ chain: 'Bitcoin', asset: 'BTC' }, 1)
    const removeLenderFunds = encodeRemoveLenderFunds({ chain: 'Ethereum', asset: 'ETH' }, null)

    const encoded = encodeBatch([addLenderFunds, removeLenderFunds])
    expect(encoded).toBe('0x020b083505050100000000000000000000000000000035060100')
  })

  it('encodes expandLoan', () => {
    const encoded = encodeExpandLoan(1, 500, [
      { asset: { chain: 'Bitcoin', asset: 'BTC' }, amount: 100 },
    ])
    expect(encoded).toMatch(/^0x350b/)
    expect(encoded).toContain('0100000000000000')
  })

  it('encodes makeRepayment full', () => {
    const encoded = encodeMakeRepayment(1, 'full')
    expect(encoded).toMatch(/^0x350c/)
    expect(encoded).toContain('0100000000000000')
    expect(encoded).toContain('00')
  })

  it('encodes makeRepayment exact', () => {
    const encoded = encodeMakeRepayment(1, 1000)
    expect(encoded).toMatch(/^0x350c/)
    expect(encoded).toContain('0100000000000000')
  })

  it('encodes initiateVoluntaryLiquidation', () => {
    const encoded = encodeInitiateVoluntaryLiquidation()
    expect(encoded).toBe('0x350d')
  })

  it('encodes stopVoluntaryLiquidation', () => {
    const encoded = encodeStopVoluntaryLiquidation()
    expect(encoded).toBe('0x350e')
  })

  it('encodes nonNativeSignedCall extrinsic', () => {
    const callHex = encodeAddLenderFunds({ chain: 'Bitcoin', asset: 'BTC' }, 1)
    const signature = new Uint8Array(65).fill(0x22)
    const signer = new Uint8Array(20).fill(0x44)

    const encoded = encodeNonNativeSignedCall(
      callHex,
      { nonce: 1, expiryBlock: 2 },
      { signature, signer },
    )

    const callBytes = Uint8Array.from([
      0x02,
      0x0a,
      0x35,
      0x05,
      0x05,
      0x01,
      ...new Uint8Array(15).fill(0x00),
      0x01,
      0x00,
      0x00,
      0x00,
      0x02,
      0x00,
      0x00,
      0x00,
      0x01,
      ...signature,
      ...signer,
      0x01,
    ])

    const versioned = Uint8Array.from([0x04, ...callBytes])
    const lengthPrefix = Uint8Array.from([0xd5, 0x01])
    const expected = bytesToHex(Uint8Array.from([...lengthPrefix, ...versioned]))

    expect(encoded).toBe(expected)
  })

  describe('encodeRemoveLenderFunds', () => {
    it('encodes partial withdrawal with specific amount', () => {
      const encoded = encodeRemoveLenderFunds({ chain: 'Bitcoin', asset: 'BTC' }, 500)
      expect(encoded).toBe('0x35060501f4010000000000000000000000000000')
    })
  })

  describe('encodeWithdrawAsset', () => {
    it('encodes withdrawal to Ethereum address', () => {
      const ethAddress = `0x${'aa'.repeat(20)}`
      const encoded = encodeWithdrawAsset(
        1000,
        { chain: 'Ethereum', asset: 'ETH' },
        { chain: 'Ethereum', address: ethAddress },
      )
      expect(encoded).toMatch(/^0x1f01/)
      expect(encoded).toMatch(/^0x[0-9a-f]+$/)
      expect(encoded).toContain('aa'.repeat(20))
    })

    it('encodes withdrawal to Bitcoin address (text-encoded)', () => {
      const btcAddress = 'bc1qtest'
      const encoded = encodeWithdrawAsset(
        50000,
        { chain: 'Bitcoin', asset: 'BTC' },
        { chain: 'Bitcoin', address: btcAddress },
      )
      expect(encoded).toMatch(/^0x1f01/)
      expect(encoded).toMatch(/^0x[0-9a-f]+$/)
    })

    it('encodes withdrawal to Solana address (base58)', () => {
      const solAddress = '11111111111111111111111111111111'
      const encoded = encodeWithdrawAsset(
        100,
        { chain: 'Solana', asset: 'SOL' },
        { chain: 'Solana', address: solAddress },
      )
      expect(encoded).toMatch(/^0x1f01/)
      expect(encoded).toMatch(/^0x[0-9a-f]+$/)
    })
  })

  describe('encodeRemoveCollateral', () => {
    it('encodes single asset removal', () => {
      const encoded = encodeRemoveCollateral([
        { asset: { chain: 'Ethereum', asset: 'ETH' }, amount: 100 },
      ])
      expect(encoded).toBe('0x3508040164000000000000000000000000000000')
    })
  })

  describe('encodeRequestLoan', () => {
    it('encodes loan request with no extra collateral', () => {
      const encoded = encodeRequestLoan({ chain: 'Ethereum', asset: 'USDC' }, 5000, null, [])
      expect(encoded).toBe('0x350903881300000000000000000000000000000000')
    })

    it('encodes loan request with extra collateral and topup asset', () => {
      const encoded = encodeRequestLoan(
        { chain: 'Ethereum', asset: 'USDC' },
        5000,
        { chain: 'Ethereum', asset: 'ETH' },
        [{ asset: { chain: 'Bitcoin', asset: 'BTC' }, amount: 10 }],
      )
      expect(encoded).toMatch(/^0x3509/)
      expect(encoded).toMatch(/^0x[0-9a-f]+$/)
    })
  })

  describe('encodeUpdateCollateralTopupAsset', () => {
    it('encodes setting topup asset', () => {
      const encoded = encodeUpdateCollateralTopupAsset({ chain: 'Ethereum', asset: 'ETH' })
      expect(encoded).toBe('0x350a0101')
    })

    it('encodes clearing topup asset (null)', () => {
      const encoded = encodeUpdateCollateralTopupAsset(null)
      expect(encoded).toBe('0x350a00')
    })
  })

  describe('encodeBatch', () => {
    it('throws if more than 10 calls', () => {
      const singleCall = encodeAddLenderFunds({ chain: 'Bitcoin', asset: 'BTC' }, 1)
      const calls = Array.from({ length: 11 }, () => singleCall)
      expect(() => encodeBatch(calls)).toThrow('Batch call limit exceeded')
    })
  })

  describe('encodeAddLenderFunds', () => {
    it('throws for unsupported asset', () => {
      expect(() => encodeAddLenderFunds({ chain: 'Arbitrum', asset: 'ETH' } as never, 1)).toThrow(
        'Unsupported Chainflip asset',
      )
    })
  })
})
