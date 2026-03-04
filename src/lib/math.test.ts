import { describe, expect, it } from 'vitest'

import { bn } from './bignumber/bignumber'
import { firstNonZeroDecimal } from './math'

describe('@/lib/math', () => {
  describe('firstNonZeroDecimal', () => {
    it('returns first significant digits for small decimal', () => {
      expect(firstNonZeroDecimal(bn('0.00000123'))).toBe('0.0000012')
    })

    it('returns whole number with first decimals', () => {
      expect(firstNonZeroDecimal(bn('1.23456'))).toBe('1.23')
    })

    it('handles negative values', () => {
      expect(firstNonZeroDecimal(bn('-0.00045'))).toBe('-0.00045')
    })

    it('handles very small values', () => {
      expect(firstNonZeroDecimal(bn('0.0000000001'))).toBe('0.0000000001')
    })

    it('captures leading zeros for amounts with no significant decimals', () => {
      expect(firstNonZeroDecimal(bn('100'))).toBe('100.0000000000')
      expect(firstNonZeroDecimal(bn('0'))).toBe('0.0000000000')
    })
  })
})
