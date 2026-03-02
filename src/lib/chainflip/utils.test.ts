import { describe, expect, it } from 'vitest'

import { baseUnitToPrecision, hexToBaseUnit, permillToDecimal } from './utils'

describe('chainflip utils', () => {
  describe('hexToBaseUnit', () => {
    it('converts hex string to decimal base unit', () => {
      expect(hexToBaseUnit('0xde0b6b3a7640000')).toBe('1000000000000000000')
    })

    it('converts small hex values', () => {
      expect(hexToBaseUnit('0x12fe4da')).toBe('19915994')
    })

    it('handles zero', () => {
      expect(hexToBaseUnit('0x0')).toBe('0')
    })

    it('returns 0 for invalid hex', () => {
      expect(hexToBaseUnit('not-hex')).toBe('0')
    })

    it('returns 0 for empty string', () => {
      expect(hexToBaseUnit('')).toBe('0')
    })
  })

  describe('baseUnitToPrecision', () => {
    it('converts ETH base unit (18 decimals) to precision', () => {
      expect(baseUnitToPrecision('1000000000000000000', 18)).toBe('1')
    })

    it('converts USDC base unit (6 decimals) to precision', () => {
      expect(baseUnitToPrecision('19915994', 6)).toBe('19.915994')
    })

    it('converts BTC base unit (8 decimals) to precision', () => {
      expect(baseUnitToPrecision('100000000', 8)).toBe('1')
    })

    it('handles zero', () => {
      expect(baseUnitToPrecision('0', 18)).toBe('0')
    })

    it('handles zero precision', () => {
      expect(baseUnitToPrecision('12345', 0)).toBe('12345')
    })
  })

  describe('permillToDecimal', () => {
    it('converts USDC utilisation rate (770365 permill) to decimal', () => {
      expect(permillToDecimal(770365)).toBe('0.770365')
    })

    it('converts USDC interest rate (32436 permill) to decimal', () => {
      expect(permillToDecimal(32436)).toBe('0.032436')
    })

    it('converts USDT utilisation rate (303623 permill) to decimal', () => {
      expect(permillToDecimal(303623)).toBe('0.303623')
    })

    it('converts USDT interest rate (12784 permill) to decimal', () => {
      expect(permillToDecimal(12784)).toBe('0.012784')
    })

    it('handles zero', () => {
      expect(permillToDecimal(0)).toBe('0')
    })

    it('handles 100% (1000000 permill)', () => {
      expect(permillToDecimal(1000000)).toBe('1')
    })

    it('converts origination fee (50 permill = 0.005%)', () => {
      expect(permillToDecimal(50)).toBe('0.00005')
    })

    it('converts origination fee (10 permill = 0.001%)', () => {
      expect(permillToDecimal(10)).toBe('0.00001')
    })
  })
})
