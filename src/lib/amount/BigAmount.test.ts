import { BigAmount, bn } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

describe('BigAmount', () => {
  // ── Construction ──────────────────────────────────

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
    it('wraps an existing BigNumber', () => {
      const amount = BigAmount.fromBN({ value: bn('1.5'), precision: 8 })
      expect(amount.toPrecision()).toBe('1.5')
      expect(amount.precision).toBe(8)
    })

    it('treats non-finite BigNumber as zero', () => {
      const amount = BigAmount.fromBN({ value: bn(Infinity), precision: 8 })
      expect(amount.isZero()).toBe(true)
    })
  })

  // ── Core safety: base unit vs precision can't be mixed ──

  describe('base unit / precision safety', () => {
    it('fromBaseUnit and fromPrecision produce the same BigAmount for equivalent values', () => {
      const fromBase = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
      const fromPrec = BigAmount.fromPrecision({ value: '1', precision: 18 })
      expect(fromBase.eq(fromPrec)).toBe(true)
      expect(fromBase.toPrecision()).toBe(fromPrec.toPrecision())
    })

    it('normalizes both to precision scale so operations are always safe', () => {
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

  // ── Round-trip: fromBaseUnit → toBaseUnit ──────────

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

  // ── Arithmetic ────────────────────────────────────

  describe('plus', () => {
    it('adds two BigAmounts with same precision', () => {
      const a = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '2.5', precision: 8 })
      expect(a.plus(b).toPrecision()).toBe('4')
    })

    it('adds a scalar to a BigAmount', () => {
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

    it('subtracts a scalar from a BigAmount', () => {
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
    it('multiplies by a scalar', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.times(60000).toPrecision()).toBe('90000')
    })

    it('multiplies by a string scalar', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      expect(amount.times('2').toBaseUnit()).toBe('300000000')
    })

    it('handles nullish scalar as zero', () => {
      const amount = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
      expect(amount.times('' as unknown as string).isZero()).toBe(true)
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

    it('handles the common pattern: base unit → fiat display', () => {
      const fiat = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
        .times(60000)
        .toFixed(2)
      expect(fiat).toBe('90000.00')
    })
  })

  // ── Comparison ────────────────────────────────────

  describe('comparison', () => {
    it('gt with BigAmount', () => {
      const a = BigAmount.fromPrecision({ value: '2', precision: 8 })
      const b = BigAmount.fromPrecision({ value: '1', precision: 8 })
      expect(a.gt(b)).toBe(true)
      expect(b.gt(a)).toBe(false)
    })

    it('gt with scalar', () => {
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

  // ── Output ────────────────────────────────────────

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

  // ── THORChain precision ──────────────────────────

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

  // ── Interop ───────────────────────────────────────

  describe('toBN', () => {
    it('returns the underlying BigNumber at precision scale', () => {
      const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
      const result = amount.toBN()
      expect(result.toFixed()).toBe('1.5')
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

  // ── Static utilities ──────────────────────────────

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

  // ── Immutability ──────────────────────────────────

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

  // ── Real-world patterns ───────────────────────────

  describe('real-world patterns', () => {
    it('base unit → fiat display (most common pattern)', () => {
      const balance = '150000000'
      const price = 60000
      const fiat = BigAmount.fromBaseUnit({ value: balance, precision: 8 }).times(price).toFixed(2)
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

    it('inline base unit conversion (replaces manual div/pow)', () => {
      const cryptoBaseUnit = '500000000'
      const price = 60000
      const result = BigAmount.fromBaseUnit({ value: cryptoBaseUnit, precision: 8 })
        .times(price)
        .toString()
      expect(result).toBe('300000')
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
      const amount = BigAmount.fromPrecision({ value: '100', precision: 6 }) // 100 USDC
      const bigIntForContract = BigInt(amount.toBaseUnit())
      expect(bigIntForContract).toBe(100000000n)
      expect(typeof bigIntForContract).toBe('bigint')
    })
  })
})
