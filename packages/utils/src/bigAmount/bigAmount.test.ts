import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { bn } from '../bignumber/bignumber'
import type { BigAmountConfig } from './bigAmount'
import { BigAmount } from './bigAmount'

describe('BigAmount', () => {
  describe('fromBaseUnit', () => {
    it('converts base unit to precision scale for BTC (8 decimals)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      expect(amount.toPrecision()).toBe('1.5')
      expect(amount.precision).toBe(8)
    })

    it('converts base unit to precision scale for ETH (18 decimals)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      expect(amount.toPrecision()).toBe('1')
      expect(amount.precision).toBe(18)
    })

    it('converts base unit to precision scale for USDC (6 decimals)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1500000', precision: 6 })
      expect(amount.toPrecision()).toBe('1.5')
      expect(amount.precision).toBe(6)
    })

    it('handles dust amounts', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1', precision: 18 })
      expect(amount.toPrecision()).toBe('0.000000000000000001')
    })

    it('handles large numbers', () => {
      const amount = BigAmount.fromBaseUnit({ value: '999999999999999999', precision: 18 })
      expect(amount.toPrecision()).toBe('0.999999999999999999')
    })

    it('handles zero', () => {
      const amount = BigAmount.fromBaseUnit({ value: '0', precision: 8 })
      expect(amount.toPrecision()).toBe('0')
      expect(amount.isZero()).toBe(true)
    })
  })

  describe('fromPrecision', () => {
    it('stores precision-scale value directly', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.toPrecision()).toBe('1.5')
      expect(amount.precision).toBe(8)
    })

    it('stores ETH amount directly', () => {
      const amount = BigAmount.fromPrecision({ value: '1', precision: 18 })
      expect(amount.toPrecision()).toBe('1')
    })

    it('accepts number inputs', () => {
      const amount = BigAmount.fromPrecision({ value: 1.5, precision: 8 })
      expect(amount.toPrecision()).toBe('1.5')
    })
  })

  describe('nullish-safe construction', () => {
    it('fromBaseUnit treats undefined as zero', () => {
      expect(BigAmount.fromBaseUnit({ value: undefined, precision: 8 }).isZero()).toBe(true)
    })

    it('fromBaseUnit treats null as zero', () => {
      expect(BigAmount.fromBaseUnit({ value: null, precision: 8 }).isZero()).toBe(true)
    })

    it('fromPrecision treats undefined as zero', () => {
      expect(BigAmount.fromPrecision({ value: undefined, precision: 8 }).isZero()).toBe(true)
    })

    it('fromPrecision treats null as zero', () => {
      expect(BigAmount.fromPrecision({ value: null, precision: 8 }).isZero()).toBe(true)
    })

    it('fromPrecision treats empty string as zero', () => {
      expect(BigAmount.fromPrecision({ value: '', precision: 8 }).isZero()).toBe(true)
    })

    it('fromPrecision treats NaN as zero', () => {
      expect(BigAmount.fromPrecision({ value: NaN, precision: 8 }).isZero()).toBe(true)
    })

    it('fromBaseUnit treats NaN as zero', () => {
      expect(BigAmount.fromBaseUnit({ value: NaN, precision: 18 }).isZero()).toBe(true)
    })
  })

  describe('zero', () => {
    it('creates a zero amount at given precision', () => {
      const amount = BigAmount.zero({ precision: 18 })
      expect(amount.isZero()).toBe(true)
      expect(amount.precision).toBe(18)
      expect(amount.toBaseUnit()).toBe('0')
    })
  })

  describe('fromBN', () => {
    it('wraps an existing BigNumber (precision-scale)', () => {
      const amount = BigAmount.fromBN({ value: bn('1.5'), precision: 8 })
      expect(amount.toPrecision()).toBe('1.5')
      expect(amount.precision).toBe(8)
    })

    it('treats non-finite BigNumber as zero', () => {
      const amount = BigAmount.fromBN({ value: bn(Infinity), precision: 8 })
      expect(amount.isZero()).toBe(true)
    })
  })

  describe('base unit / precision safety', () => {
    it('fromBaseUnit and fromPrecision produce the same BigAmount for equivalent values', () => {
      const fromBase = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      const fromPrec = BigAmount.fromPrecision({ value: '1', precision: 18 })
      expect(fromBase.eq(fromPrec)).toBe(true)
      expect(fromBase.toPrecision()).toBe(fromPrec.toPrecision())
    })

    it('normalizes both to base unit scale so operations are always safe', () => {
      const a = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '0.5', precision: 8 })
      const sum = a.plus(b)
      expect(sum.toPrecision()).toBe('2')
      expect(sum.toBaseUnit()).toBe('200000000')
    })

    it('prevents the classic bug: accidentally adding wei to ETH', () => {
      const oneEthFromWei = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      const oneEthFromPrecision = BigAmount.fromPrecision({ value: '1', precision: 18 })
      expect(oneEthFromWei.plus(oneEthFromPrecision).toPrecision()).toBe('2')
    })
  })

  describe('round-trip', () => {
    it.each([
      { baseUnit: '150000000', precision: 8, label: 'BTC' },
      { baseUnit: '1000000000000000000', precision: 18, label: 'ETH' },
      { baseUnit: '1500000', precision: 6, label: 'USDC' },
      { baseUnit: '1', precision: 18, label: 'dust ETH' },
      { baseUnit: '999999999999999999', precision: 18, label: 'large ETH' },
      { baseUnit: '0', precision: 8, label: 'zero' },
      { baseUnit: '100000000000', precision: 8, label: '1000 BTC' },
    ])(
      '$label: fromBaseUnit($baseUnit, $precision) → toBaseUnit() === $baseUnit',
      ({ baseUnit, precision }) => {
        const amount = BigAmount.fromBaseUnit({ value: baseUnit, precision })
        expect(amount.toBaseUnit()).toBe(baseUnit)
      },
    )
  })

  describe('plus', () => {
    it('adds two BigAmounts with same precision', () => {
      const a = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2.5', precision: 8 })
      expect(a.plus(b).toPrecision()).toBe('4')
    })

    it('adds a scalar to a BigAmount (scalar is precision-scale)', () => {
      const a = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(a.plus('0.5').toPrecision()).toBe('2')
    })

    it('throws when adding BigAmounts with different precisions', () => {
      const btc = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const eth = BigAmount.fromPrecision({ value: '1', precision: 18 })
      expect(() => btc.plus(eth)).toThrow('different precisions: 8 vs 18')
    })
  })

  describe('minus', () => {
    it('subtracts two BigAmounts with same precision', () => {
      const a = BigAmount.fromPrecision({ value: '5', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(a.minus(b).toPrecision()).toBe('3')
    })

    it('subtracts a scalar from a BigAmount (scalar is precision-scale)', () => {
      const a = BigAmount.fromPrecision({ value: '5', precision: 8 })
      expect(a.minus('2').toPrecision()).toBe('3')
    })

    it('throws when subtracting BigAmounts with different precisions', () => {
      const btc = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const eth = BigAmount.fromPrecision({ value: '1', precision: 18 })
      expect(() => btc.minus(eth)).toThrow('different precisions: 8 vs 18')
    })
  })

  describe('times', () => {
    it('multiplies by a dimensionless scalar', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.times(2).toPrecision()).toBe('3')
      expect(amount.times(2).toBaseUnit()).toBe('300000000')
    })

    it('multiplies by a string scalar', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      expect(amount.times('2').toBaseUnit()).toBe('300000000')
    })

    it('handles null scalar as zero', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.times(null).isZero()).toBe(true)
    })

    it('handles undefined scalar as zero', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.times(undefined).isZero()).toBe(true)
    })

    it('handles empty string scalar as zero', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.times('').isZero()).toBe(true)
    })

    it('throws if passed a BigAmount (dimensionally invalid)', () => {
      const a = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(() => a.times(b as unknown as string)).toThrow('does not accept BigAmount')
    })
  })

  describe('div', () => {
    it('divides by a scalar', () => {
      const amount = BigAmount.fromPrecision({ value: '10', precision: 8 })
      expect(amount.div(2).toPrecision()).toBe('5')
    })

    it('handles fractional division', () => {
      const amount = BigAmount.fromPrecision({ value: '1', precision: 8 })
      expect(amount.div(3).toFixed(8)).toBe('0.33333333')
    })

    it('throws if passed a BigAmount (dimensionally invalid)', () => {
      const a = BigAmount.fromPrecision({ value: '10', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(() => a.div(b as unknown as string)).toThrow('does not accept BigAmount')
    })
  })

  describe('abs', () => {
    it('returns absolute value', () => {
      const amount = BigAmount.fromPrecision({ value: '-5', precision: 8 })
      expect(amount.abs().toPrecision()).toBe('5')
    })
  })

  describe('negated', () => {
    it('negates the value', () => {
      const amount = BigAmount.fromPrecision({ value: '5', precision: 8 })
      expect(amount.negated().toPrecision()).toBe('-5')
    })
  })

  describe('positiveOrZero', () => {
    it('returns self for positive amounts', () => {
      const amount = BigAmount.fromPrecision({ value: '5', precision: 8 })
      expect(amount.positiveOrZero().toPrecision()).toBe('5')
    })

    it('returns zero for negative amounts', () => {
      const amount = BigAmount.fromPrecision({ value: '-5', precision: 8 })
      const result = amount.positiveOrZero()
      expect(result.isZero()).toBe(true)
      expect(result.precision).toBe(8)
    })

    it('returns self for zero', () => {
      const amount = BigAmount.zero({ precision: 8 })
      expect(amount.positiveOrZero().isZero()).toBe(true)
    })
  })

  describe('decimalPlaces', () => {
    it('rounds to specified decimal places', () => {
      const amount = BigAmount.fromPrecision({ value: '1.123456789', precision: 18 })
      expect(amount.decimalPlaces(4).toPrecision()).toBe('1.1235')
    })

    it('rounds down when specified', () => {
      const amount = BigAmount.fromPrecision({ value: '1.999', precision: 18 })
      expect(amount.decimalPlaces(2, 1).toPrecision()).toBe('1.99') // ROUND_DOWN = 1
    })
  })

  describe('arithmetic chaining', () => {
    it('chains multiple operations with precision', () => {
      const result = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
        .times(2500)
        .div(1.1)
        .toFixed(2)
      expect(result).toBe('2272.72')
    })

    it('base unit → fiat via toPrecision', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      const fiat = bn(amount.toPrecision()).times(60000).toFixed(2)
      expect(fiat).toBe('90000.00')
    })
  })

  describe('comparison', () => {
    it('gt with BigAmount', () => {
      const a = BigAmount.fromPrecision({ value: '2', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '1', precision: 8 })
      expect(a.gt(b)).toBe(true)
      expect(b.gt(a)).toBe(false)
    })

    it('gt with scalar (scalar is precision-scale)', () => {
      const a = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(a.gt('1')).toBe(true)
      expect(a.gt('3')).toBe(false)
    })

    it('gte', () => {
      const a = BigAmount.fromPrecision({ value: '2', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(a.gte(b)).toBe(true)
      expect(a.gte('2')).toBe(true)
      expect(a.gte('3')).toBe(false)
    })

    it('lt', () => {
      const a = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(a.lt(b)).toBe(true)
      expect(a.lt('0')).toBe(false)
    })

    it('lte', () => {
      const a = BigAmount.fromPrecision({ value: '1', precision: 8 })
      expect(a.lte('1')).toBe(true)
      expect(a.lte('2')).toBe(true)
      expect(a.lte('0')).toBe(false)
    })

    it('eq', () => {
      const a = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(a.eq(b)).toBe(true)
      expect(a.eq('1.5')).toBe(true)
      expect(a.eq('2')).toBe(false)
    })

    it('throws on comparison with different precision BigAmount', () => {
      const btc = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const eth = BigAmount.fromPrecision({ value: '1', precision: 18 })
      expect(() => btc.gt(eth)).toThrow('different precisions')
      expect(() => btc.gte(eth)).toThrow('different precisions')
      expect(() => btc.lt(eth)).toThrow('different precisions')
      expect(() => btc.lte(eth)).toThrow('different precisions')
      expect(() => btc.eq(eth)).toThrow('different precisions')
    })
  })

  describe('boolean checks', () => {
    it('isZero', () => {
      expect(BigAmount.fromPrecision({ value: '0', precision: 8 }).isZero()).toBe(true)
      expect(BigAmount.fromPrecision({ value: '1', precision: 8 }).isZero()).toBe(false)
    })

    it('isPositive', () => {
      expect(BigAmount.fromPrecision({ value: '1', precision: 8 }).isPositive()).toBe(true)
      expect(BigAmount.fromPrecision({ value: '-1', precision: 8 }).isPositive()).toBe(false)
      expect(BigAmount.fromPrecision({ value: '0', precision: 8 }).isPositive()).toBe(true) // BigNumber considers 0 positive
    })

    it('isNegative', () => {
      expect(BigAmount.fromPrecision({ value: '-1', precision: 8 }).isNegative()).toBe(true)
      expect(BigAmount.fromPrecision({ value: '1', precision: 8 }).isNegative()).toBe(false)
    })

    it('isFinite', () => {
      expect(BigAmount.fromPrecision({ value: '1', precision: 8 }).isFinite()).toBe(true)
      expect(BigAmount.fromPrecision({ value: undefined, precision: 8 }).isFinite()).toBe(true)
    })
  })

  describe('toBaseUnit', () => {
    it('converts to integer base unit string', () => {
      expect(BigAmount.fromPrecision({ value: '1.5', precision: 8 }).toBaseUnit()).toBe('150000000')
    })

    it('converts ETH to wei', () => {
      expect(BigAmount.fromPrecision({ value: '1', precision: 18 }).toBaseUnit()).toBe(
        '1000000000000000000',
      )
    })

    it('converts USDC to micro-units', () => {
      expect(BigAmount.fromPrecision({ value: '100.5', precision: 6 }).toBaseUnit()).toBe(
        '100500000',
      )
    })

    it('converts zero', () => {
      expect(BigAmount.zero({ precision: 8 }).toBaseUnit()).toBe('0')
    })

    it('returns stored base unit value directly (identity for fromBaseUnit)', () => {
      expect(BigAmount.fromBaseUnit({ value: '12345', precision: 8 }).toBaseUnit()).toBe('12345')
    })
  })

  describe('toPrecision', () => {
    it('returns full precision string', () => {
      expect(BigAmount.fromBaseUnit({ value: '150000000', precision: 8 }).toPrecision()).toBe('1.5')
    })

    it('is an alias for toString', () => {
      const amount = BigAmount.fromBaseUnit({ value: '123456789', precision: 8 })
      expect(amount.toPrecision()).toBe(amount.toString())
    })
  })

  describe('toFixed', () => {
    it('returns fixed decimal places', () => {
      expect(BigAmount.fromPrecision({ value: '1.5', precision: 8 }).toFixed(2)).toBe('1.50')
    })

    it('rounds down by default', () => {
      expect(BigAmount.fromPrecision({ value: '1.999', precision: 8 }).toFixed(2)).toBe('1.99')
    })

    it('returns full precision when no decimals specified', () => {
      expect(BigAmount.fromPrecision({ value: '1.5', precision: 8 }).toFixed()).toBe('1.5')
    })
  })

  describe('toNumber', () => {
    it('returns JS number', () => {
      expect(BigAmount.fromPrecision({ value: '1.5', precision: 8 }).toNumber()).toBe(1.5)
    })
  })

  describe('toSignificant', () => {
    it('handles integers', () => {
      expect(BigAmount.fromPrecision({ value: '1234', precision: 8 }).toSignificant(3)).toBe('1234')
    })

    it('handles values with integer and decimal parts', () => {
      expect(BigAmount.fromPrecision({ value: '1.5', precision: 8 }).toSignificant(3)).toBe('1.5')
    })

    it('trims trailing zeros from significant digits', () => {
      expect(BigAmount.fromPrecision({ value: '1.500', precision: 8 }).toSignificant(4)).toBe('1.5')
    })

    it('handles dust amounts', () => {
      expect(BigAmount.fromBaseUnit({ value: '1', precision: 18 }).toSignificant(4)).toBe(
        '0.000000000000000001',
      )
    })

    it('handles small amounts with leading zeros', () => {
      expect(BigAmount.fromPrecision({ value: '0.00012345', precision: 18 }).toSignificant(4)).toBe(
        '0.0001234',
      )
    })

    it('handles zero', () => {
      expect(BigAmount.fromPrecision({ value: '0', precision: 8 }).toSignificant(4)).toBe('0')
    })

    it('handles negative values', () => {
      expect(
        BigAmount.fromPrecision({ value: '-0.00012345', precision: 18 }).toSignificant(4),
      ).toBe('-0.0001234')
    })

    it('handles values where integer part exceeds requested digits', () => {
      expect(BigAmount.fromPrecision({ value: '12345.6789', precision: 18 }).toSignificant(3)).toBe(
        '12345',
      )
    })

    it('handles values where integer part uses some significant digits', () => {
      expect(BigAmount.fromPrecision({ value: '12.3456', precision: 18 }).toSignificant(4)).toBe(
        '12.34',
      )
    })
  })

  describe('fromThorBaseUnit', () => {
    it('creates BigAmount from THOR 8-decimal base unit', () => {
      const amount = BigAmount.fromThorBaseUnit('150000000')
      expect(amount.toPrecision()).toBe('1.5')
      expect(amount.precision).toBe(8)
    })

    it('handles nullish as zero', () => {
      expect(BigAmount.fromThorBaseUnit(undefined).isZero()).toBe(true)
    })
  })

  describe('toThorBaseUnit', () => {
    it('converts ETH (18 decimals) human value to THOR base unit', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1500000000000000000', precision: 18 })
      expect(amount.toThorBaseUnit()).toBe('150000000')
    })

    it('converts BTC (8 decimals) — no-op since BTC and THOR share precision', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      expect(amount.toThorBaseUnit()).toBe('150000000')
      expect(amount.toThorBaseUnit()).toBe(amount.toBaseUnit())
    })

    it('converts USDC (6 decimals) human value to THOR base unit', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1500000', precision: 6 })
      expect(amount.toThorBaseUnit()).toBe('150000000')
    })

    it('converts from fromPrecision() the same way', () => {
      const fromBase = BigAmount.fromBaseUnit({ value: '1500000000000000000', precision: 18 })
      const fromPrec = BigAmount.fromPrecision({ value: '1.5', precision: 18 })
      expect(fromBase.toThorBaseUnit()).toBe(fromPrec.toThorBaseUnit())
      expect(fromPrec.toThorBaseUnit()).toBe('150000000')
    })

    it('handles zero', () => {
      expect(BigAmount.zero({ precision: 18 }).toThorBaseUnit()).toBe('0')
    })

    it('replaces the old toThorBaseUnit({ valueCryptoBaseUnit, asset }) pattern', () => {
      const nativeBaseUnit = '1500000000000000000'
      const assetPrecision = 18
      const thorBaseUnit = BigAmount.fromBaseUnit({
        value: nativeBaseUnit,
        precision: assetPrecision,
      }).toThorBaseUnit()
      expect(thorBaseUnit).toBe('150000000')
    })
  })

  describe('fromThorBaseUnit + toThorBaseUnit round-trip', () => {
    it('round-trips THOR base unit → human → THOR base unit', () => {
      const original = '150000000'
      const result = BigAmount.fromThorBaseUnit(original).toThorBaseUnit()
      expect(result).toBe(original)
    })

    it('round-trips with toBaseUnit (same as toThorBaseUnit for precision 8)', () => {
      const original = BigAmount.fromThorBaseUnit('150000000')
      expect(original.toBaseUnit()).toBe('150000000')
      expect(original.toThorBaseUnit()).toBe('150000000')
    })
  })

  describe('JSON serialization', () => {
    it('round-trips through toJSON/fromJSON', () => {
      const original = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      const json = original.toJSON()
      expect(json).toEqual({ value: '150000000', precision: 8 })

      const restored = BigAmount.fromJSON(json)
      expect(restored.eq(original)).toBe(true)
      expect(restored.toBaseUnit()).toBe('150000000')
    })

    it('round-trips ETH through toJSON/fromJSON', () => {
      const original = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      const json = original.toJSON()
      const restored = BigAmount.fromJSON(json)
      expect(restored.toBaseUnit()).toBe('1000000000000000000')
    })
  })

  describe('min', () => {
    it('returns the smallest amount', () => {
      const a = BigAmount.fromPrecision({ value: '3', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const c = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(BigAmount.min(a, b, c).toPrecision()).toBe('1')
    })

    it('works with two amounts', () => {
      const a = BigAmount.fromPrecision({ value: '5', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '3', precision: 8 })
      expect(BigAmount.min(a, b).toPrecision()).toBe('3')
    })

    it('throws with different precisions', () => {
      const a = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2', precision: 18 })
      expect(() => BigAmount.min(a, b)).toThrow('different precisions')
    })

    it('throws with no arguments', () => {
      expect(() => BigAmount.min()).toThrow('at least one argument')
    })

    it('returns the single amount when given one', () => {
      const a = BigAmount.fromPrecision({ value: '5', precision: 8 })
      expect(BigAmount.min(a).toPrecision()).toBe('5')
    })
  })

  describe('max', () => {
    it('returns the largest amount', () => {
      const a = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '3', precision: 8 })
      const c = BigAmount.fromPrecision({ value: '2', precision: 8 })
      expect(BigAmount.max(a, b, c).toPrecision()).toBe('3')
    })

    it('works with two amounts', () => {
      const a = BigAmount.fromPrecision({ value: '5', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '3', precision: 8 })
      expect(BigAmount.max(a, b).toPrecision()).toBe('5')
    })

    it('throws with different precisions', () => {
      const a = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2', precision: 18 })
      expect(() => BigAmount.max(a, b)).toThrow('different precisions')
    })

    it('throws with no arguments', () => {
      expect(() => BigAmount.max()).toThrow('at least one argument')
    })
  })

  describe('isBigAmount', () => {
    it('returns true for BigAmount instances', () => {
      expect(BigAmount.isBigAmount(BigAmount.fromPrecision({ value: '1', precision: 8 }))).toBe(
        true,
      )
    })

    it('returns false for non-BigAmount values', () => {
      expect(BigAmount.isBigAmount('1.5')).toBe(false)
      expect(BigAmount.isBigAmount(1.5)).toBe(false)
      expect(BigAmount.isBigAmount(null)).toBe(false)
      expect(BigAmount.isBigAmount(undefined)).toBe(false)
      expect(BigAmount.isBigAmount(bn('1.5'))).toBe(false)
    })
  })

  describe('immutability', () => {
    it('arithmetic operations return new instances', () => {
      const a = BigAmount.fromPrecision({ value: '1', precision: 8 })
      const b = a.plus('1')
      expect(a.toPrecision()).toBe('1')
      expect(b.toPrecision()).toBe('2')
    })

    it('abs returns new instance', () => {
      const a = BigAmount.fromPrecision({ value: '-5', precision: 8 })
      const b = a.abs()
      expect(a.toPrecision()).toBe('-5')
      expect(b.toPrecision()).toBe('5')
    })

    it('negated returns new instance', () => {
      const a = BigAmount.fromPrecision({ value: '5', precision: 8 })
      const b = a.negated()
      expect(a.toPrecision()).toBe('5')
      expect(b.toPrecision()).toBe('-5')
    })
  })

  describe('real-world patterns', () => {
    it('base unit → fiat display via toPrecision()', () => {
      const balance = '150000000'
      const price = 60000
      const fiat = bn(BigAmount.fromBaseUnit({ value: balance, precision: 8 }).toPrecision())
        .times(price)
        .toFixed(2)
      expect(fiat).toBe('90000.00')
    })

    it('user input → chain storage', () => {
      const userInput = '0.5'
      const baseUnit = BigAmount.fromPrecision({ value: userInput, precision: 8 }).toBaseUnit()
      expect(baseUnit).toBe('50000000')
    })

    it('guard check: balance is zero', () => {
      expect(BigAmount.fromPrecision({ value: '0', precision: 8 }).isZero()).toBe(true)
    })

    it('dimensionless scalar multiplication (rate, distribution, etc.)', () => {
      const cryptoBaseUnit = '500000000'
      const distributionRate = 0.5
      const result = BigAmount.fromBaseUnit({ value: cryptoBaseUnit, precision: 8 }).times(
        distributionRate,
      )
      expect(result.toPrecision()).toBe('2.5')
      expect(result.toBaseUnit()).toBe('250000000')
    })

    it('comparison with maximum amount', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.gt('1.0')).toBe(true)
    })

    it('contract interaction: BigAmount → BigInt via BigInt(toBaseUnit())', () => {
      const userInput = '1.5'
      expect(
        BigInt(BigAmount.fromPrecision({ value: userInput, precision: 18 }).toBaseUnit()),
      ).toBe(1500000000000000000n)
    })

    it('ETH gas calculation', () => {
      const gasLimit = '21000'
      const gasPriceGwei = '30'
      const gasCostWei = bn(gasLimit).times(bn(gasPriceGwei).times(1e9)).toFixed(0)
      const gasCostEth = BigAmount.fromBaseUnit({ value: gasCostWei, precision: 18 })
      expect(gasCostEth.toPrecision()).toBe('0.00063')
    })

    it('ERC-20 approval with exact BigInt (viem pattern)', () => {
      const amount = BigAmount.fromPrecision({ value: '100', precision: 6 })
      const bigIntForContract = BigInt(amount.toBaseUnit())
      expect(bigIntForContract).toBe(100000000n)
      expect(typeof bigIntForContract).toBe('bigint')
    })
  })

  describe('base-unit internal storage', () => {
    it('fromBaseUnit stores value directly (no division)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      expect(amount.toBaseUnit()).toBe('150000000')
    })

    it('fromPrecision converts to base units for storage', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.toBaseUnit()).toBe('150000000')
    })

    it('.times() operates on base units (dimensionless scalar)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
      expect(amount.times(2).toBaseUnit()).toBe('200')
    })
  })

  describe('assetId', () => {
    const mockConfig = {
      resolvePrecision: (assetId: string) => {
        if (assetId === 'bip122:000000000019d6689c085ae165831e93/slip44:0') return 8
        if (assetId === 'test-asset') return 8
        return 0
      },
    }

    beforeAll(() => {
      BigAmount.configure(mockConfig)
    })

    it('fromBaseUnit with assetId resolves precision and carries assetId', () => {
      const amount = BigAmount.fromBaseUnit({
        value: '150000000',
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      })
      expect(amount.assetId).toBe('bip122:000000000019d6689c085ae165831e93/slip44:0')
      expect(amount.precision).toBe(8)
      expect(amount.toPrecision()).toBe('1.5')
    })

    it('fromPrecision with assetId resolves precision and carries assetId', () => {
      const amount = BigAmount.fromPrecision({
        value: '1.5',
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      })
      expect(amount.assetId).toBe('bip122:000000000019d6689c085ae165831e93/slip44:0')
      expect(amount.precision).toBe(8)
    })

    it('assetId is undefined when using precision variant', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
      expect(amount.assetId).toBeUndefined()
    })

    it('assetId propagates through arithmetic', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', assetId: 'test-asset' })
      expect(amount.plus('1').assetId).toBe('test-asset')
      expect(amount.minus('1').assetId).toBe('test-asset')
      expect(amount.times(2).assetId).toBe('test-asset')
      expect(amount.div(2).assetId).toBe('test-asset')
      expect(amount.abs().assetId).toBe('test-asset')
      expect(amount.negated().assetId).toBe('test-asset')
    })

    it('zero carries optional assetId', () => {
      const amount = BigAmount.zero({ precision: 8, assetId: 'test-asset' })
      expect(amount.assetId).toBe('test-asset')
      expect(amount.isZero()).toBe(true)
    })

    it('toJSON does not include assetId', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', assetId: 'test-asset' })
      expect(amount.toJSON()).toEqual({ value: '100', precision: 8 })
    })

    it('fromJSON round-trips value and precision', () => {
      const original = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
      const restored = BigAmount.fromJSON(original.toJSON())
      expect(restored.toBaseUnit()).toBe('100')
      expect(restored.precision).toBe(8)
    })

    it('discriminated union prevents passing both precision and assetId', () => {
      // @ts-expect-error — discriminated union: precision and assetId are mutually exclusive
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8, assetId: 'test-asset' })
      expect(amount).toBeDefined()
    })
  })

  describe('configure', () => {
    const mockConfig = {
      resolvePrecision: (assetId: string) => {
        if (assetId === 'btc') return 8
        if (assetId === 'eth') return 18
        if (assetId === 'usdc') return 6
        return 0
      },
    }

    beforeAll(() => {
      BigAmount.configure(mockConfig)
    })

    it('fromBaseUnit with assetId resolves precision from config', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', assetId: 'btc' })
      expect(amount.precision).toBe(8)
      expect(amount.assetId).toBe('btc')
      expect(amount.toPrecision()).toBe('1.5')
    })

    it('fromPrecision with assetId resolves precision from config', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', assetId: 'btc' })
      expect(amount.precision).toBe(8)
      expect(amount.toBaseUnit()).toBe('150000000')
    })

    it('fromBaseUnit with assetId works for ETH (18 decimals)', () => {
      const amount = BigAmount.fromBaseUnit({
        value: '1000000000000000000',
        assetId: 'eth',
      })
      expect(amount.precision).toBe(18)
      expect(amount.toPrecision()).toBe('1')
    })

    it('precision variant has no assetId (discriminated union)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 4 })
      expect(amount.precision).toBe(4)
      expect(amount.assetId).toBeUndefined()
    })
  })

  describe('NullableScalar widening', () => {
    const amount = BigAmount.fromPrecision({ value: '10', precision: 8 })

    describe('times accepts null/undefined', () => {
      it('times(null) returns zero', () => {
        expect(amount.times(null).isZero()).toBe(true)
      })

      it('times(undefined) returns zero', () => {
        expect(amount.times(undefined).isZero()).toBe(true)
      })

      it('times(string) still works', () => {
        expect(amount.times('2').toPrecision()).toBe('20')
      })
    })

    describe('div accepts null/undefined', () => {
      it('div(null) returns zero (safe division)', () => {
        expect(amount.div(null).isZero()).toBe(true)
      })

      it('div(undefined) returns zero (safe division)', () => {
        expect(amount.div(undefined).isZero()).toBe(true)
      })
    })

    describe('plus accepts null/undefined scalar', () => {
      it('plus(null) is identity', () => {
        expect(amount.plus(null).eq(amount)).toBe(true)
      })

      it('plus(undefined) is identity', () => {
        expect(amount.plus(undefined).eq(amount)).toBe(true)
      })
    })

    describe('minus accepts null/undefined scalar', () => {
      it('minus(null) is identity', () => {
        expect(amount.minus(null).eq(amount)).toBe(true)
      })

      it('minus(undefined) is identity', () => {
        expect(amount.minus(undefined).eq(amount)).toBe(true)
      })
    })

    describe('comparison accepts null/undefined scalar', () => {
      it('gt(null) — positive amount is greater than zero', () => {
        expect(amount.gt(null)).toBe(true)
      })

      it('gt(undefined) — positive amount is greater than zero', () => {
        expect(amount.gt(undefined)).toBe(true)
      })

      it('gte(null) — positive amount is gte zero', () => {
        expect(amount.gte(null)).toBe(true)
      })

      it('gte(undefined) — positive amount is gte zero', () => {
        expect(amount.gte(undefined)).toBe(true)
      })

      it('lt(null) — positive amount is NOT less than zero', () => {
        expect(amount.lt(null)).toBe(false)
      })

      it('lt(undefined) — positive amount is NOT less than zero', () => {
        expect(amount.lt(undefined)).toBe(false)
      })

      it('lte(null) — positive amount is NOT lte zero', () => {
        expect(amount.lte(null)).toBe(false)
      })

      it('lte(undefined) — positive amount is NOT lte zero', () => {
        expect(amount.lte(undefined)).toBe(false)
      })

      it('eq(null) — non-zero amount is NOT equal to zero', () => {
        expect(amount.eq(null)).toBe(false)
      })

      it('eq(undefined) — non-zero amount is NOT equal to zero', () => {
        expect(amount.eq(undefined)).toBe(false)
      })

      it('zero eq(null) — zero IS equal to null-as-zero', () => {
        expect(BigAmount.zero({ precision: 8 }).eq(null)).toBe(true)
      })

      it('zero eq(undefined) — zero IS equal to undefined-as-zero', () => {
        expect(BigAmount.zero({ precision: 8 }).eq(undefined)).toBe(true)
      })
    })

    describe('real-world pattern: optional chaining without bnOrZero', () => {
      it('balance.times(marketData?.price) where price is undefined', () => {
        const balance = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
        const marketData: { price?: string } = {}
        const result = balance.times(marketData?.price)
        expect(result.isZero()).toBe(true)
      })

      it('balance.times(marketData?.price) where price exists', () => {
        const balance = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
        const marketData: { price?: string } = { price: '60000' }
        const result = balance.times(marketData?.price)
        expect(result.toPrecision()).toBe('90000')
      })

      it('amount.gt(threshold) where threshold is undefined', () => {
        const balance = BigAmount.fromPrecision({ value: '100', precision: 8 })
        const threshold: string | undefined = undefined
        expect(balance.gt(threshold)).toBe(true)
      })

      it('amount.lt(limit) where limit is null', () => {
        const balance = BigAmount.fromPrecision({ value: '100', precision: 8 })
        const limit: string | null = null
        expect(balance.lt(limit)).toBe(false)
      })
    })
  })

  describe('div safety', () => {
    it('div(0) returns zero instead of Infinity', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      expect(amount.div(0).isZero()).toBe(true)
      expect(amount.div(0).isFinite()).toBe(true)
    })

    it('div(null) returns zero', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      expect(amount.div(null).isZero()).toBe(true)
    })

    it('div(undefined) returns zero', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      expect(amount.div(undefined).isZero()).toBe(true)
    })

    it('div("") returns zero', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      expect(amount.div('').isZero()).toBe(true)
    })

    it('div("0") returns zero', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      expect(amount.div('0').isZero()).toBe(true)
    })

    it('div on zero amount by zero returns zero', () => {
      expect(BigAmount.zero({ precision: 18 }).div(0).isZero()).toBe(true)
    })

    it('div by valid divisor still works', () => {
      const amount = BigAmount.fromPrecision({ value: '10', precision: 8 })
      expect(amount.div(2).toPrecision()).toBe('5')
    })

    it('preserves precision', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
      const result = amount.div(0)
      expect(result.precision).toBe(8)
    })

    it('preserves assetId through div(0)', () => {
      const amount = BigAmount.zero({ precision: 8, assetId: 'test-asset' }).plus(
        BigAmount.fromBaseUnit({ value: '100', precision: 8 }),
      )
      const result = amount.div(0)
      expect(result.assetId).toBe('test-asset')
    })
  })

  describe('unconfigured state', () => {
    let savedConfig: BigAmountConfig | undefined

    beforeAll(() => {
      savedConfig = BigAmount.getConfig()
      BigAmount.resetConfig()
    })

    afterAll(() => {
      if (savedConfig) BigAmount.configure(savedConfig)
    })

    it('throws when using assetId resolution without config', () => {
      expect(() =>
        BigAmount.fromBaseUnit({ value: '1000000', assetId: 'eip155:1/slip44:60' }),
      ).toThrow('BigAmount: not configured')
    })

    it('works fine with explicit precision when unconfigured', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1000000', precision: 6 })
      expect(amount.toPrecision()).toBe('1')
    })
  })

  describe('negative precision', () => {
    it('handles negative precision mathematically (multiplies instead of divides)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: -2 })
      expect(amount.toPrecision()).toBe('10000')
    })

    it('round-trips with negative precision', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: -2 })
      expect(amount.toBaseUnit()).toBe('100')
    })
  })

  describe('toBN', () => {
    it('returns precision-scale BigNumber', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      const result = amount.toBN()
      expect(result.toString()).toBe('1.5')
    })

    it('can be used in BN arithmetic chains', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      expect(amount.toBN().times(60000).toFixed(2)).toBe('90000.00')
    })

    it('returns zero for zero amount', () => {
      expect(BigAmount.zero({ precision: 8 }).toBN().isZero()).toBe(true)
    })

    it('handles negative values', () => {
      const amount = BigAmount.fromPrecision({ value: '-1.5', precision: 8 })
      expect(amount.toBN().toString()).toBe('-1.5')
    })

    it('avoids string round-trip vs manual conversion', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      const viaBN = amount.toBN()
      const viaString = bn(amount.toPrecision())
      expect(viaBN.eq(viaString)).toBe(true)
    })
  })

  describe('discriminated union enforcement', () => {
    const mockConfig = {
      resolvePrecision: (assetId: string) => {
        if (assetId === 'btc') return 8
        if (assetId === 'eth') return 18
        if (assetId === 'usdc') return 6
        return 0
      },
    }

    beforeAll(() => {
      BigAmount.configure(mockConfig)
    })

    it('fromBaseUnit with precision only — no assetId', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      expect(amount.precision).toBe(8)
      expect(amount.assetId).toBeUndefined()
      expect(amount.toPrecision()).toBe('1.5')
    })

    it('fromBaseUnit with assetId only — resolves precision from config', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', assetId: 'btc' })
      expect(amount.precision).toBe(8)
      expect(amount.assetId).toBe('btc')
      expect(amount.toPrecision()).toBe('1.5')
    })

    it('fromPrecision with precision only — no assetId', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.precision).toBe(8)
      expect(amount.assetId).toBeUndefined()
    })

    it('fromPrecision with assetId only — resolves precision from config', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', assetId: 'btc' })
      expect(amount.precision).toBe(8)
      expect(amount.assetId).toBe('btc')
      expect(amount.toBaseUnit()).toBe('150000000')
    })

    it('assetId variant resolves ETH precision 18 correctly', () => {
      const amount = BigAmount.fromBaseUnit({
        value: '1000000000000000000',
        assetId: 'eth',
      })
      expect(amount.precision).toBe(18)
      expect(amount.toPrecision()).toBe('1')
    })

    it('assetId variant resolves USDC precision 6 correctly', () => {
      const amount = BigAmount.fromPrecision({ value: '100', assetId: 'usdc' })
      expect(amount.precision).toBe(6)
      expect(amount.toBaseUnit()).toBe('100000000')
    })

    it('passing both precision and assetId is a TypeScript error', () => {
      // @ts-expect-error — discriminated union: precision and assetId are mutually exclusive
      BigAmount.fromBaseUnit({ value: '100', precision: 8, assetId: 'btc' })

      // @ts-expect-error — discriminated union: precision and assetId are mutually exclusive
      BigAmount.fromPrecision({ value: '1', precision: 8, assetId: 'btc' })
    })
  })

  describe('uint256-scale values', () => {
    const maxUint256 =
      '115792089237316195423570985008687907853269984665640564039457584007913129639935'

    it('handles max uint256', () => {
      const amount = BigAmount.fromBaseUnit({ value: maxUint256, precision: 18 })
      expect(amount.toBaseUnit()).toBe(maxUint256)
      expect(amount.isFinite()).toBe(true)
      expect(amount.isZero()).toBe(false)
    })

    it('round-trips uint256 through toJSON/fromJSON', () => {
      const amount = BigAmount.fromBaseUnit({ value: maxUint256, precision: 18 })
      const restored = BigAmount.fromJSON(amount.toJSON())
      expect(restored.toBaseUnit()).toBe(maxUint256)
    })

    it('arithmetic on uint256 values', () => {
      const large = '100000000000000000000000000000000000000'
      const amount = BigAmount.fromBaseUnit({ value: large, precision: 18 })
      expect(amount.times(2).div(2).toBaseUnit()).toBe(large)
    })
  })

  describe('precision 0', () => {
    it('constructs with precision 0', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 0 })
      expect(amount.toPrecision()).toBe('100')
      expect(amount.toBaseUnit()).toBe('100')
    })

    it('round-trips with precision 0', () => {
      expect(BigAmount.fromBaseUnit({ value: '42', precision: 0 }).toBaseUnit()).toBe('42')
    })

    it('zero with precision 0', () => {
      const z = BigAmount.zero({ precision: 0 })
      expect(z.isZero()).toBe(true)
      expect(z.toBaseUnit()).toBe('0')
      expect(z.toPrecision()).toBe('0')
    })

    it('arithmetic with precision 0', () => {
      const a = BigAmount.fromBaseUnit({ value: '10', precision: 0 })
      const b = BigAmount.fromBaseUnit({ value: '3', precision: 0 })
      expect(a.plus(b).toBaseUnit()).toBe('13')
    })

    it('fromPrecision with precision 0 is same as fromBaseUnit', () => {
      const a = BigAmount.fromBaseUnit({ value: '100', precision: 0 })
      const b = BigAmount.fromPrecision({ value: '100', precision: 0 })
      expect(a.eq(b)).toBe(true)
    })
  })

  describe('negative values in fromBaseUnit', () => {
    it('handles negative base unit values', () => {
      const amount = BigAmount.fromBaseUnit({ value: '-150000000', precision: 8 })
      expect(amount.toPrecision()).toBe('-1.5')
      expect(amount.isNegative()).toBe(true)
      expect(amount.toBaseUnit()).toBe('-150000000')
    })

    it('round-trips negative values', () => {
      const amount = BigAmount.fromBaseUnit({ value: '-1000000000000000000', precision: 18 })
      expect(amount.toBaseUnit()).toBe('-1000000000000000000')
    })
  })

  describe('toBaseUnit rounding', () => {
    it('rounds correctly after fractional multiplication', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
      expect(amount.times(0.333).toBaseUnit()).toBe('33')
    })

    it('rounds at .5 boundary (ROUND_HALF_UP)', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
      expect(amount.times(0.005).toBaseUnit()).toBe('1')
    })

    it('rounds down below .5', () => {
      const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
      // 100 * 0.004 = 0.4 → rounds to 0
      expect(amount.times(0.004).toBaseUnit()).toBe('0')
    })
  })

  describe('precision stability over chained operations', () => {
    it('maintains exact value through 20 times(2)/div(2) cycles', () => {
      let amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      for (let i = 0; i < 20; i++) {
        amount = amount.times(2).div(2)
      }
      expect(amount.toBaseUnit()).toBe('1000000000000000000')
    })

    it('maintains value through plus/minus cycles', () => {
      const original = BigAmount.fromPrecision({ value: '100', precision: 8 })
      let amount = original
      for (let i = 0; i < 10; i++) {
        amount = amount.plus('50').minus('50')
      }
      expect(amount.eq(original)).toBe(true)
    })
  })

  describe('toSignificant edge cases', () => {
    it('toSignificant(0) returns integer part only', () => {
      const amount = BigAmount.fromPrecision({ value: '12.345', precision: 18 })
      expect(amount.toSignificant(0)).toBe('12')
    })

    it('toSignificant(1) returns one significant digit after leading zeros', () => {
      const amount = BigAmount.fromPrecision({ value: '0.00456', precision: 18 })
      expect(amount.toSignificant(1)).toBe('0.004')
    })

    it('toSignificant(1) on value with integer part', () => {
      const amount = BigAmount.fromPrecision({ value: '5.678', precision: 18 })
      expect(amount.toSignificant(1)).toBe('5')
    })
  })

  describe('decimalPlaces edge cases', () => {
    it('handles zero decimal places', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1234567890', precision: 8 })
      expect(amount.decimalPlaces(0).toPrecision()).toBe('12')
    })

    it('handles decimal places larger than precision', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1234567890', precision: 8 })
      expect(amount.decimalPlaces(20).toPrecision()).toBe('12.3456789')
    })

    it('handles dust amount with many leading zeros', () => {
      const amount = BigAmount.fromBaseUnit({ value: '1', precision: 18 })
      expect(amount.decimalPlaces(18).toPrecision()).toBe('0.000000000000000001')
      expect(amount.decimalPlaces(17).toPrecision()).toBe('0')
    })

    it('uses ROUND_HALF_UP by default', () => {
      const amount = BigAmount.fromBaseUnit({ value: '199999999', precision: 8 })
      expect(amount.decimalPlaces(2).toPrecision()).toBe('2')
    })
  })
})
