import { describe, expect, it } from 'vitest'

import type { QuoteResponse } from '../../types'
import {
  canRetry,
  hasQuote,
  hasReceiveAddress,
  hasValidInput,
  hasWallet,
  isApprovalRequired,
  isEvmChain,
  isSolanaChain,
  isUtxoChain,
} from '../guards'
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
  selectedRate: null,
  quote: null,
  txHash: null,
  approvalTxHash: null,
  error: null,
  retryCount: 0,
  chainType: 'evm',
  slippage: '0.5',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  effectiveReceiveAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
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
  })

  describe('hasQuote', () => {
    it('returns false when quote is null', () => {
      expect(hasQuote(createTestContext())).toBe(false)
    })

    it('returns true when quote is present', () => {
      expect(hasQuote(createTestContext({ quote: {} as QuoteResponse }))).toBe(true)
    })

    it('returns true when quote has approval data', () => {
      expect(
        hasQuote(
          createTestContext({
            quote: { approval: { isRequired: true, spender: '0xSpender' } } as QuoteResponse,
          }),
        ),
      ).toBe(true)
    })
  })

  describe('isApprovalRequired', () => {
    it('returns false when quote is null', () => {
      expect(isApprovalRequired(createTestContext())).toBe(false)
    })

    it('returns false when approval is not required', () => {
      expect(
        isApprovalRequired(
          createTestContext({
            quote: { approval: { isRequired: false, spender: '0xSpender' } } as QuoteResponse,
          }),
        ),
      ).toBe(false)
    })

    it('returns true when approval is required for ERC20 on EVM chain', () => {
      expect(
        isApprovalRequired(
          createTestContext({
            sellAsset: {
              assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              chainId: 'eip155:1',
              symbol: 'USDC',
              name: 'USD Coin',
              precision: 6,
            },
            chainType: 'evm',
            quote: { approval: { isRequired: true, spender: '0xSpender' } } as QuoteResponse,
          }),
        ),
      ).toBe(true)
    })

    it('returns false when approval is required but sell asset is native (slip44)', () => {
      expect(
        isApprovalRequired(
          createTestContext({
            chainType: 'evm',
            quote: { approval: { isRequired: true, spender: '0xSpender' } } as QuoteResponse,
          }),
        ),
      ).toBe(false)
    })

    it('returns false when approval is required but chain is not EVM', () => {
      expect(
        isApprovalRequired(
          createTestContext({
            chainType: 'utxo',
            quote: { approval: { isRequired: true, spender: '0xSpender' } } as QuoteResponse,
          }),
        ),
      ).toBe(false)
    })

    it('returns false when quote has no approval field', () => {
      expect(
        isApprovalRequired(
          createTestContext({
            quote: {} as QuoteResponse,
          }),
        ),
      ).toBe(false)
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

  describe('isEvmChain', () => {
    it('returns true for evm chain', () => {
      expect(isEvmChain(createTestContext({ chainType: 'evm' }))).toBe(true)
    })

    it('returns false for utxo chain', () => {
      expect(isEvmChain(createTestContext({ chainType: 'utxo' }))).toBe(false)
    })
  })

  describe('isUtxoChain', () => {
    it('returns true for utxo chain', () => {
      expect(isUtxoChain(createTestContext({ chainType: 'utxo' }))).toBe(true)
    })

    it('returns false for evm chain', () => {
      expect(isUtxoChain(createTestContext({ chainType: 'evm' }))).toBe(false)
    })
  })

  describe('isSolanaChain', () => {
    it('returns true for solana chain', () => {
      expect(isSolanaChain(createTestContext({ chainType: 'solana' }))).toBe(true)
    })

    it('returns false for evm chain', () => {
      expect(isSolanaChain(createTestContext({ chainType: 'evm' }))).toBe(false)
    })
  })

  describe('hasWallet', () => {
    it('returns true when walletAddress is set', () => {
      expect(hasWallet(createTestContext())).toBe(true)
    })

    it('returns false when walletAddress is undefined', () => {
      expect(hasWallet(createTestContext({ walletAddress: undefined }))).toBe(false)
    })

    it('returns false when walletAddress is empty string', () => {
      expect(hasWallet(createTestContext({ walletAddress: '' }))).toBe(false)
    })
  })

  describe('hasReceiveAddress', () => {
    it('returns true when effectiveReceiveAddress is set', () => {
      expect(hasReceiveAddress(createTestContext())).toBe(true)
    })

    it('returns false when effectiveReceiveAddress is empty', () => {
      expect(hasReceiveAddress(createTestContext({ effectiveReceiveAddress: '' }))).toBe(false)
    })
  })
})
