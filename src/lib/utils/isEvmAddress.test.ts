import { describe, expect, it } from 'vitest'

import { isEvmAddress } from './isEvmAddress'

describe('isEvmAddress', () => {
  it('returns true for valid checksummed address', () => {
    expect(isEvmAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(true)
  })

  it('returns true for valid lowercase address', () => {
    expect(isEvmAddress('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')).toBe(true)
  })

  it('returns true for zero address', () => {
    expect(isEvmAddress('0x0000000000000000000000000000000000000000')).toBe(true)
  })

  it('returns false for non-hex string', () => {
    expect(isEvmAddress('not-an-address')).toBe(false)
  })

  it('returns false for too-short address', () => {
    expect(isEvmAddress('0x1234')).toBe(false)
  })

  it('returns false for address without 0x prefix', () => {
    expect(isEvmAddress('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEvmAddress('')).toBe(false)
  })
})
