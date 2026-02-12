import { describe, expect, it } from 'vitest'

import { BigNumber, bn, bnOrZero, positiveOrZero, convertPrecision } from './bignumber'

describe('bignumber', () => {
  describe('bn', () => {
    it('creates BigNumber from number', () => {
      expect(bn(42).toNumber()).toBe(42)
    })

    it('creates BigNumber from string', () => {
      expect(bn('1.5').toNumber()).toBe(1.5)
    })

    it('supports base parameter', () => {
      expect(bn('ff', 16).toNumber()).toBe(255)
    })
  })

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

    it('returns zero for null', () => {
      expect(bnOrZero(null).toString()).toBe('0')
    })

    it('returns zero for undefined', () => {
      expect(bnOrZero(undefined).toString()).toBe('0')
    })

    it('returns zero for NaN', () => {
      expect(bnOrZero(NaN).toString()).toBe('0')
    })

    it('returns zero for Infinity', () => {
      expect(bnOrZero(Infinity).toString()).toBe('0')
    })

    it('preserves valid numeric strings', () => {
      expect(bnOrZero('123.456').toString()).toBe('123.456')
    })
  })

  describe('positiveOrZero', () => {
    it('returns positive value as-is', () => {
      expect(positiveOrZero('42').toString()).toBe('42')
    })

    it('returns zero for negative value', () => {
      expect(positiveOrZero('-5').toString()).toBe('0')
    })

    it('returns zero for zero', () => {
      expect(positiveOrZero('0').toString()).toBe('0')
    })

    it('returns zero for null', () => {
      expect(positiveOrZero(null).toString()).toBe('0')
    })

    it('returns zero for undefined', () => {
      expect(positiveOrZero(undefined).toString()).toBe('0')
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
})
