import '@/lib/polyfills'

import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it } from 'vitest'

import { useLocaleFormatter } from './useLocaleFormatter'

import { FiatCurrencyTypeEnum } from '@/constants/FiatCurrencyTypeEnum'
import { TestProviders } from '@/test/TestProviders'

const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
  <TestProviders>{children}</TestProviders>
)

const setup = (fiat: FiatCurrencyTypeEnum) =>
  renderHook(() => useLocaleFormatter({ locale: 'en-US', fiatType: fiat }), { wrapper }).result
    .current

/** What Amount.Fiat passes - the currency's own minor units */
const balance = (fiat: FiatCurrencyTypeEnum) => {
  const { number } = setup(fiat)
  return (value: number) =>
    number.toFiat(value, { maximumFractionDigits: number.localeParts.fraction })
}

/** What Amount.Price passes - nothing, so digits scale to the value's magnitude */
const price = (fiat: FiatCurrencyTypeEnum) => {
  const { number } = setup(fiat)
  return (value: number) => number.toFiat(value)
}

describe('useLocaleFormatter currency precision', () => {
  describe('minor units are read from the currency, not assumed to be cents', () => {
    it.each([
      [FiatCurrencyTypeEnum.USD, 2],
      [FiatCurrencyTypeEnum.EUR, 2],
      [FiatCurrencyTypeEnum.JPY, 0],
      [FiatCurrencyTypeEnum.KRW, 0],
      [FiatCurrencyTypeEnum.KWD, 3],
    ])('%s has %i minor units', (fiat, expected) => {
      expect(setup(fiat).number.localeParts.fraction).toEqual(expected)
    })
  })

  describe('balances render in minor units', () => {
    it('USD', () => {
      const fmt = balance(FiatCurrencyTypeEnum.USD)
      expect(fmt(1234.45)).toEqual('$1,234.45')
      expect(fmt(0.123)).toEqual('$0.12')
      expect(fmt(0)).toEqual('$0.00')
    })

    it('JPY has no minor unit, so no phantom decimals', () => {
      const fmt = balance(FiatCurrencyTypeEnum.JPY)
      expect(fmt(123.45)).toEqual('¥123')
      expect(fmt(1234.45)).toEqual('¥1,234')
      expect(fmt(0)).toEqual('¥0')
    })

    it('KWD keeps its third decimal', () => {
      const fmt = balance(FiatCurrencyTypeEnum.KWD)
      expect(fmt(1.2345)).toEqual('KWD\u00a01.235')
      expect(fmt(123.4567)).toEqual('KWD\u00a0123.457')
    })
  })

  describe('a displayed value is never a flat zero unless it is actually zero', () => {
    it('USD falls back to the cent', () => {
      const fmt = balance(FiatCurrencyTypeEnum.USD)
      // Every one of these previously rendered "$0.00", indistinguishable from an unpriced asset
      expect(fmt(0.00123)).toEqual('<$0.01')
      expect(fmt(0.000123)).toEqual('<$0.01')
      expect(fmt(0.0000001)).toEqual('<$0.01')
      expect(fmt(0)).toEqual('$0.00')
    })

    it('the threshold follows the currency, not a hardcoded 0.000001', () => {
      expect(balance(FiatCurrencyTypeEnum.JPY)(0.9)).toEqual('<¥1')
      expect(balance(FiatCurrencyTypeEnum.KWD)(0.0005)).toEqual('<KWD\u00a00.001')
    })
  })

  describe('prices scale their digits to the magnitude', () => {
    const fmt = price(FiatCurrencyTypeEnum.USD)

    it('keeps sub-cent precision a balance would round away', () => {
      expect(fmt(0.123)).toEqual('$0.123')
      expect(fmt(0.00123)).toEqual('$0.00123')
      expect(fmt(0.000123)).toEqual('$0.000123')
    })

    it('never exceeds six fraction digits', () => {
      expect(fmt(0.0000123)).toEqual('$0.000012')
      expect(fmt(0.00000123)).toEqual('$0.000001')
      expect(fmt(0.0000001)).toEqual('<$0.000001')
    })

    it('drops decimals between 10k and 1M, whatever the asset', () => {
      expect(fmt(123456)).toEqual('$123,456')
      expect(fmt(9999.99)).toEqual('$9,999.99')
    })
  })
})
