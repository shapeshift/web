import { describe, expect, it } from 'vitest'

import { canRetry, hasValidInput, isExactOutput } from '../guards'
import type { SwapMachineContext } from '../types'

const createTestContext = (overrides?: Partial<SwapMachineContext>): SwapMachineContext => ({
  sellAsset: {
    assetId: 'eip155:1/slip44:60',
    chainId: 'eip155:1',
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
  },
  buyAsset: {
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: 'eip155:1',
    symbol: 'USDC',
    name: 'USD Coin',
    precision: 6,
  },
  sellAmount: '1.0',
  sellAmountBaseUnit: '1000000000000000000',
  buyAmount: '',
  buyAmountBaseUnit: undefined,
  isSellAmountFiat: false,
  sellAmountFiat: '',
  selectedRate: null,
  quote: null,
  txHash: null,
  txLink: null,
  buyTxLink: null,
  swapperTxLink: null,
  depositObservedAt: null,
  approvalTxHash: null,
  error: null,
  errorSource: null,
  retryCount: 0,
  chainType: 'evm',
  isDepositFlow: false,
  slippage: '0.5',
  sendAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receiveAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  isSellAssetEvm: true,
  isSellAssetUtxo: false,
  isSellAssetSolana: false,
  isBuyAssetEvm: true,
  ...overrides,
})

describe('guards', () => {
  describe('hasValidInput', () => {
    it('returns true when all required fields are present', () => {
      expect(hasValidInput(createTestContext())).toBe(true)
    })

    it('returns false when sellAmountBaseUnit is undefined', () => {
      expect(hasValidInput(createTestContext({ sellAmountBaseUnit: undefined }))).toBe(false)
    })

    it('returns false when sellAmountBaseUnit is "0"', () => {
      expect(hasValidInput(createTestContext({ sellAmountBaseUnit: '0' }))).toBe(false)
    })

    it('returns false when sellAmountBaseUnit is empty string', () => {
      expect(hasValidInput(createTestContext({ sellAmountBaseUnit: '' }))).toBe(false)
    })

    // The sell amount only arrives with the rate, so requiring it would never let quoting start
    it('is satisfied by a buy amount alone in exact-output mode', () => {
      expect(
        hasValidInput(
          createTestContext({ sellAmountBaseUnit: undefined, buyAmountBaseUnit: '100000' }),
        ),
      ).toBe(true)
    })

    it('returns false when the exact-output buy amount is "0"', () => {
      expect(
        hasValidInput(createTestContext({ sellAmountBaseUnit: undefined, buyAmountBaseUnit: '0' })),
      ).toBe(false)
    })
  })

  describe('isExactOutput', () => {
    it('is off without a buy amount', () => {
      expect(isExactOutput(createTestContext())).toBe(false)
    })

    it('is on whenever a buy amount drives the trade', () => {
      expect(isExactOutput(createTestContext({ buyAmountBaseUnit: '100000' }))).toBe(true)
    })
  })



  describe('canRetry', () => {
    it('returns true when retryCount is 0', () => {
      expect(canRetry(createTestContext({ retryCount: 0 }))).toBe(true)
    })

    it('returns true when retryCount is 2', () => {
      expect(canRetry(createTestContext({ retryCount: 2 }))).toBe(true)
    })

    it('returns false when retryCount is 3', () => {
      expect(canRetry(createTestContext({ retryCount: 3 }))).toBe(false)
    })

    it('returns false when retryCount is greater than 3', () => {
      expect(canRetry(createTestContext({ retryCount: 5 }))).toBe(false)
    })
  })





})
