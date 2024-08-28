import { describe, expect, it } from 'vitest'

import { baseUnitToHuman, BigNumber, bn, bnOrZero, convertPrecision } from './bignumber'

describe('bignumber', () => {
  describe('bnOrZero', () => {
    it('returns an instance of bignumber', () => {
      const zero = bnOrZero(0)
      expect(zero).toBeInstanceOf(BigNumber)
      const one = bnOrZero(1)
      expect(one).toBeInstanceOf(BigNumber)

      const foo = bnOrZero('foo')
      expect(foo).toBeInstanceOf(BigNumber)
      expect(foo.toString()).toBe('0')

      const empty = bnOrZero('')
      expect(empty).toBeInstanceOf(BigNumber)
      expect(empty.toString()).toBe('0')
    })
  })

  describe('convertPrecision', () => {
    it('can convert values for increased precision', () => {
      const value = '1234'
      const expectation = bn('1234000')

      const result = convertPrecision({ value, inputExponent: 3, outputExponent: 6 })
      expect(result).toEqual(expectation)
    })

    it('can convert values for decreased precision', () => {
      const value = '1234000'
      const expectation = bn('1234')

      const result = convertPrecision({ value, inputExponent: 6, outputExponent: 3 })
      expect(result).toEqual(expectation)
    })

    it('treats 0 as 0 when increasing precision', () => {
      const value = '0'
      const expectation = bn('0')

      const result = convertPrecision({ value, inputExponent: 12, outputExponent: 18 })
      expect(result).toEqual(expectation)
    })

    it('treats 0 as 0 when decreasing precision', () => {
      const value = '0'
      const expectation = bn('0')

      const result = convertPrecision({ value, inputExponent: 18, outputExponent: 12 })
      expect(result).toEqual(expectation)
    })

    it('does not remove decimals with rounding', () => {
      const value = '1234567'
      const expectation = bn('1234.567')

      const result = convertPrecision({ value, inputExponent: 6, outputExponent: 3 })
      expect(result).toEqual(expectation)
    })
  })
  describe('baseUnitToHuman', () => {
    it('converts BigNumber value to human-readable format with 6 decimal places (inputExponent 8)', () => {
      const value = '123456789012345'
      const inputExponent = 8
      const result = baseUnitToHuman({ value, inputExponent })

      expect(result.toFixed()).toBe('1234567.890123')
    })

    it('converts BigNumber value to human-readable format with 6 decimal places (inputExponent 6)', () => {
      const value = '12345000000'
      const inputExponent = 6
      const result = baseUnitToHuman({ value, inputExponent })

      expect(result.toFixed()).toBe('12345')
    })

    it('converts BigNumber value to human-readable format with 6 decimal places (inputExponent 18)', () => {
      const value = '100000000000000000000'
      const inputExponent = 18
      const result = baseUnitToHuman({ value, inputExponent })

      expect(result.toFixed()).toBe('100')
    })

    it('rounds down BigNumber value to human-readable format with 6 decimal places (inputExponent 8)', () => {
      const value = '123456789012345'
      const inputExponent = 8
      const result = baseUnitToHuman({ value, inputExponent })

      expect(result.toFixed()).toBe('1234567.890123')
    })

    it('rounds up BigNumber value close to 1 to human-readable format with 6 decimal places (inputExponent 18)', () => {
      const value = '999999999999999999'
      const inputExponent = 18
      const result = baseUnitToHuman({ value, inputExponent })

      expect(result.toFixed()).toBe('1')
    })

    it('rounds up the last decimal of a BigNumber value to human-readable format with 6 decimal places (inputExponent 18)', () => {
      const value = '123459900000000000'
      const inputExponent = 18
      const result = baseUnitToHuman({ value, inputExponent })

      expect(result.toFixed()).toBe('0.12346')
    })
  })
})
