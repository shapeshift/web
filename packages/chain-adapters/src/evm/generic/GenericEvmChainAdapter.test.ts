import { describe, expect, it, vi } from 'vitest'

import { GenericEvmChainAdapter, isGenericEvmChainAdapter } from './GenericEvmChainAdapter'

vi.mock('ethers', () => ({
  Contract: vi.fn(),
  Interface: vi.fn(),
  JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
}))

describe('GenericEvmChainAdapter', () => {
  describe('isGenericEvmChainAdapter', () => {
    it('should return false for non-adapter objects', () => {
      expect(isGenericEvmChainAdapter({})).toBe(false)
      expect(isGenericEvmChainAdapter(null)).toBe(false)
      expect(isGenericEvmChainAdapter(undefined)).toBe(false)
    })
  })

  describe('GenericEvmChainAdapter', () => {
    it('should have correct static rootBip44Params', () => {
      expect(GenericEvmChainAdapter.rootBip44Params).toEqual({
        purpose: 44,
        coinType: 60,
        accountNumber: 0,
      })
    })
  })
})
