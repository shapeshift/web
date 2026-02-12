import { BigAmount } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import { fromBaseUnit, toBaseUnit } from './math'

describe('@/lib/math', () => {
  describe('fromBaseUnit', () => {
    it('should return precision-scale string from BigAmount', () => {
      const ba = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      expect(fromBaseUnit(ba)).toBe('1')
    })

    it('should handle high precision values', () => {
      const ba = BigAmount.fromBaseUnit({ value: '182912819182912192', precision: 18 })
      expect(fromBaseUnit(ba)).toBe('0.182912819182912192')
    })

    it('should handle zero', () => {
      const ba = BigAmount.fromBaseUnit({ value: '0', precision: 18 })
      expect(fromBaseUnit(ba)).toBe('0')
    })

    it('should handle low precision assets', () => {
      const ba = BigAmount.fromBaseUnit({ value: '123456789', precision: 4 })
      expect(fromBaseUnit(ba)).toBe('12345.6789')
    })
  })

  describe('toBaseUnit', () => {
    it('should return base-unit string from BigAmount', () => {
      const ba = BigAmount.fromPrecision({ value: '1.5', precision: 18 })
      expect(toBaseUnit(ba)).toBe('1500000000000000000')
    })

    it('should handle whole numbers', () => {
      const ba = BigAmount.fromPrecision({ value: '100', precision: 8 })
      expect(toBaseUnit(ba)).toBe('10000000000')
    })

    it('should handle zero', () => {
      const ba = BigAmount.fromPrecision({ value: '0', precision: 18 })
      expect(toBaseUnit(ba)).toBe('0')
    })
  })
})
