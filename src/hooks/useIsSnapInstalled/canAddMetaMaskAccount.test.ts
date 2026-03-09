// @vitest-environment jsdom
import { btcChainId, cosmosChainId, ethChainId, solanaChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { describe, expect, it, vi } from 'vitest'

import { canAddMetaMaskAccount } from './useIsSnapInstalled'

// Mock isMetaMask - returns true by default (canAddMetaMaskAccount throws otherwise)
const mockIsMetaMask = vi.fn().mockReturnValue(true)
vi.mock('@shapeshiftoss/hdwallet-core/wallet', () => ({
  isMetaMask: (...args: unknown[]) => mockIsMetaMask(...args),
}))

// Default: not native multichain
const mockIsMetaMaskNativeMultichain = vi.fn().mockReturnValue(false)
vi.mock('@shapeshiftoss/hdwallet-metamask-multichain', () => ({
  isMetaMaskNativeMultichain: (...args: unknown[]) => mockIsMetaMaskNativeMultichain(...args),
}))

// Mock isEvmChainId to match real behavior for known chain IDs
vi.mock('@shapeshiftoss/chain-adapters', () => ({
  isEvmChainId: (chainId: string) => chainId === ethChainId,
}))

const makeWallet = (overrides: Record<string, unknown> = {}): HDWallet =>
  ({
    _isMetaMask: true,
    ...overrides,
  }) as unknown as HDWallet

describe('canAddMetaMaskAccount', () => {
  describe('account 0', () => {
    it('should always return true regardless of chain or snap', () => {
      const wallet = makeWallet()
      expect(
        canAddMetaMaskAccount({ accountNumber: 0, chainId: ethChainId, wallet, isSnapInstalled: false }),
      ).toBe(true)
      expect(
        canAddMetaMaskAccount({ accountNumber: 0, chainId: btcChainId, wallet, isSnapInstalled: false }),
      ).toBe(true)
    })
  })

  describe('native multichain wallet', () => {
    it('should return false for EVM chain with account > 0', () => {
      mockIsMetaMaskNativeMultichain.mockReturnValue(true)
      const wallet = makeWallet({ _isMetaMaskNativeMultichain: true })

      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: ethChainId, wallet, isSnapInstalled: false }),
      ).toBe(false)
    })

    it('should return true for BTC chain with account > 0', () => {
      mockIsMetaMaskNativeMultichain.mockReturnValue(true)
      const wallet = makeWallet({ _isMetaMaskNativeMultichain: true })

      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: btcChainId, wallet, isSnapInstalled: false }),
      ).toBe(true)
    })

    it('should return true for Solana chain with account > 0', () => {
      mockIsMetaMaskNativeMultichain.mockReturnValue(true)
      const wallet = makeWallet({ _isMetaMaskNativeMultichain: true })

      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: solanaChainId, wallet, isSnapInstalled: false }),
      ).toBe(true)
    })
  })

  describe('non-native MM without snap', () => {
    it('should return false for account > 0 regardless of chain', () => {
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)
      const wallet = makeWallet()

      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: ethChainId, wallet, isSnapInstalled: false }),
      ).toBe(false)
      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: btcChainId, wallet, isSnapInstalled: false }),
      ).toBe(false)
    })
  })

  describe('non-native MM with snap installed', () => {
    it('should return false for EVM chain with account > 0', () => {
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)
      const wallet = makeWallet()

      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: ethChainId, wallet, isSnapInstalled: true }),
      ).toBe(false)
    })

    it('should return false for Cosmos chain with account > 0', () => {
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)
      const wallet = makeWallet()

      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: cosmosChainId, wallet, isSnapInstalled: true }),
      ).toBe(false)
    })

    it('should return true for UTXO chain (BTC) with account > 0', () => {
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)
      const wallet = makeWallet()

      expect(
        canAddMetaMaskAccount({ accountNumber: 1, chainId: btcChainId, wallet, isSnapInstalled: true }),
      ).toBe(true)
    })
  })

  describe('non-MetaMask wallet', () => {
    it('should throw if wallet is not MetaMask', () => {
      mockIsMetaMask.mockReturnValueOnce(false)
      const wallet = { _isMetaMask: false } as unknown as HDWallet

      expect(() =>
        canAddMetaMaskAccount({ accountNumber: 1, chainId: ethChainId, wallet, isSnapInstalled: false }),
      ).toThrow('canAddMetaMaskAccount should only be called in the context of a MetaMask adapter')
    })
  })
})
