import { describe, expect, it } from 'vitest'

import {
  GENERIC_EVM_CHAINS,
  getGenericChainAssetId,
  getGenericChainConfig,
  isGenericChainId,
} from './genericChains'

describe('genericChains', () => {
  describe('isGenericChainId', () => {
    it('should return false for unknown chain IDs when array is empty', () => {
      expect(isGenericChainId('eip155:12345')).toBe(false)
    })

    it('should return false for known chain IDs', () => {
      expect(isGenericChainId('eip155:1')).toBe(false)
    })
  })

  describe('getGenericChainConfig', () => {
    it('should return undefined for unknown chain IDs', () => {
      expect(getGenericChainConfig('eip155:99999')).toBeUndefined()
    })
  })

  describe('getGenericChainAssetId', () => {
    it('should return undefined for unknown chain IDs', () => {
      expect(getGenericChainAssetId('eip155:99999')).toBeUndefined()
    })
  })

  describe('GENERIC_EVM_CHAINS', () => {
    it('should be an array', () => {
      expect(Array.isArray(GENERIC_EVM_CHAINS)).toBe(true)
    })
  })
})
