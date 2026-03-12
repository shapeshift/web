import { describe, expect, it } from 'vitest'

import { isMetaMaskNativeMultichain } from './native-multichain'

describe('isMetaMaskNativeMultichain', () => {
  it('should return false for null', () => {
    expect(isMetaMaskNativeMultichain(null)).toBe(false)
  })

  it('should return false for a non-object value', () => {
    // cast to satisfy TS - runtime receives a primitive
    expect(isMetaMaskNativeMultichain('not-a-wallet' as any)).toBe(false)
    expect(isMetaMaskNativeMultichain(42 as any)).toBe(false)
  })

  it('should return false for a regular MetaMask wallet without _isMetaMaskNativeMultichain', () => {
    const wallet = { _isMetaMask: true } as any
    expect(isMetaMaskNativeMultichain(wallet)).toBeFalsy()
  })

  it('should return false when _isMetaMaskNativeMultichain is falsy', () => {
    const wallet = { _isMetaMask: true, _isMetaMaskNativeMultichain: false } as any
    expect(isMetaMaskNativeMultichain(wallet)).toBe(false)
  })

  it('should return true for a native multichain wallet', () => {
    const wallet = { _isMetaMask: true, _isMetaMaskNativeMultichain: true } as any
    expect(isMetaMaskNativeMultichain(wallet)).toBe(true)
  })
})
