import { describe, expect, it, vi } from 'vitest'
import type { EvmGenericChainConfig } from '@shapeshiftoss/caip'
import { GenericEvmChainAdapter, isGenericEvmChainAdapter } from './GenericEvmChainAdapter'

vi.mock('ethers', () => ({
  Contract: vi.fn(),
  Interface: vi.fn(),
  JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
}))

const mockConfig: EvmGenericChainConfig = {
  chainId: 'eip155:12345',
  name: 'TestChain',
  displayName: 'Test Chain',
  nativeAssetId: 'eip155:12345/slip44:60',
  rpcUrl: 'https://rpc.test.com',
  iconName: 'test',
  explorerUrl: 'https://explorer.test.com',
}

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
