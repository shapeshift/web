import { BigAmount } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import { bn } from './bignumber/bignumber'
import { firstNonZeroDecimal, fromBaseUnit, toBaseUnit } from './math'

describe('@/lib/math', () => {
  describe('fromBaseUnit', () => {
    describe('BigAmount overload', () => {
      it('returns precision-scale string from BigAmount', () => {
        const ba = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
        expect(fromBaseUnit(ba)).toBe('1')
      })

      it('handles high precision values', () => {
        const ba = BigAmount.fromBaseUnit({ value: '182912819182912192', precision: 18 })
        expect(fromBaseUnit(ba)).toBe('0.182912819182912192')
      })

      it('handles zero', () => {
        const ba = BigAmount.fromBaseUnit({ value: '0', precision: 18 })
        expect(fromBaseUnit(ba)).toBe('0')
      })
    })

    describe('positional args overload', () => {
      it('converts base unit string with precision', () => {
        expect(fromBaseUnit('1000000000000000000', 18)).toBe('1')
      })

      it('handles BTC precision', () => {
        expect(fromBaseUnit('150000000', 8)).toBe('1.5')
      })

      it('handles USDC precision', () => {
        expect(fromBaseUnit('1500000', 6)).toBe('1.5')
      })

      it('handles undefined value', () => {
        expect(fromBaseUnit(undefined, 18)).toBe('0')
      })

      it('handles zero', () => {
        expect(fromBaseUnit('0', 8)).toBe('0')
      })

      it('handles low precision assets', () => {
        expect(fromBaseUnit('123456789', 4)).toBe('12345.6789')
      })
    })
  })

  describe('toBaseUnit', () => {
    describe('BigAmount overload', () => {
      it('returns base-unit string from BigAmount', () => {
        const ba = BigAmount.fromPrecision({ value: '1.5', precision: 18 })
        expect(toBaseUnit(ba)).toBe('1500000000000000000')
      })

      it('handles whole numbers', () => {
        const ba = BigAmount.fromPrecision({ value: '100', precision: 8 })
        expect(toBaseUnit(ba)).toBe('10000000000')
      })

      it('handles zero', () => {
        const ba = BigAmount.fromPrecision({ value: '0', precision: 18 })
        expect(toBaseUnit(ba)).toBe('0')
      })
    })

    describe('positional args overload', () => {
      it('converts precision-scale string to base unit', () => {
        expect(toBaseUnit('1.5', 18)).toBe('1500000000000000000')
      })

      it('handles BTC precision', () => {
        expect(toBaseUnit('1.5', 8)).toBe('150000000')
      })

      it('handles USDC precision', () => {
        expect(toBaseUnit('1.5', 6)).toBe('1500000')
      })

      it('handles undefined value', () => {
        expect(toBaseUnit(undefined, 18)).toBe('0')
      })

      it('handles whole numbers', () => {
        expect(toBaseUnit('100', 8)).toBe('10000000000')
      })
    })
  })

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

  describe('edge cases', () => {
    it('fromBaseUnit and toBaseUnit are inverse operations', () => {
      const original = '12345678901234567890'
      const precision = 18
      const human = fromBaseUnit(original, precision)
      const backToBase = toBaseUnit(human, precision)
      expect(backToBase).toBe(original)
    })

    it('BigAmount overloads produce same results as positional args', () => {
      const value = '1500000000'
      const precision = 8
      const fromPositional = fromBaseUnit(value, precision)
      const fromBigAmount = fromBaseUnit(BigAmount.fromBaseUnit({ value, precision }))
      expect(fromPositional).toBe(fromBigAmount)
    })

    it('handles precision 0 (no decimals)', () => {
      expect(fromBaseUnit('42', 0)).toBe('42')
      expect(toBaseUnit('42', 0)).toBe('42')
    })
  })
})
