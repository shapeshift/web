import { BigAmount } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import { fromBaseUnit, toBaseUnit } from './math'

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
})
