import 'lib/polyfills'

import { renderHook, RenderHookResult } from '@testing-library/react-hooks'
import { FiatTypeEnum } from 'constants/FiatTypeEnum'

import { FiatParts, NumberFormatter, NumberValue, useLocaleFormatter } from './useLocaleFormatter'

type Scenario = [string, FiatTypeEnum, string[]]

function setup({
  locale,
  fiat
}: {
  locale?: string
  fiat: FiatTypeEnum
}): RenderHookResult<unknown, NumberFormatter> {
  return renderHook(() => useLocaleFormatter({ locale, fiatType: fiat }))
}

describe('useLocaleFormatter', () => {
  const scenarios: Scenario[] = [
    [
      'en-US',
      FiatTypeEnum.USD,
      [
        '$123.45',
        '$1,234.45',
        '$123,456',
        '$123,456',
        '$123.45M',
        '$123.45B',
        '$123,456,789.45',
        '$0.123',
        '$0.0123',
        '$0.00123',
        '$0.000123',
        '$0.0000123',
        '$0.00000123',
        '<$0.000001'
      ]
    ],
    [
      'en-GB',
      FiatTypeEnum.EUR,
      [
        '€123.45',
        '€1,234.45',
        '€123,456',
        '€123,456',
        '€123.45M',
        '€123.45B',
        '€123,456,789.45',
        '€0.123',
        '€0.0123',
        '€0.00123',
        '€0.000123',
        '€0.0000123',
        '€0.00000123',
        '<€0.000001'
      ]
    ],
    [
      'de-DE',
      FiatTypeEnum.EUR,
      [
        '123,45 €',
        '1.234,45 €',
        '123.456 €',
        '123.456 €',
        '123,45 Mio. €',
        '123,45 Mrd. €',
        '123.456.789,45 €',
        '0,123 €',
        '0,0123 €',
        '0,00123 €',
        '0,000123 €',
        '0,0000123 €',
        '0,00000123 €',
        '<0,000001 €'
      ]
    ],
    [
      'en',
      FiatTypeEnum.JPY,
      [
        '¥123.45',
        '¥1,234.45',
        '¥123,456',
        '¥123,456',
        '¥123.45M',
        '¥123.45B',
        '¥123,456,789.45',
        '¥0.123',
        '¥0.0123',
        '¥0.00123',
        '¥0.000123',
        '¥0.0000123',
        '¥0.00000123',
        '<¥0.000001'
      ]
    ],
    [
      'ja-JP',
      FiatTypeEnum.JPY,
      [
        '￥123.45',
        '￥1,234.45',
        '￥123,456',
        '￥123,456',
        '￥1.23億',
        '￥1234.56億',
        '￥123,456,789.45',
        '￥0.123',
        '￥0.0123',
        '￥0.00123',
        '￥0.000123',
        '￥0.0000123',
        '￥0.00000123',
        '<￥0.000001'
      ]
    ],
    [
      'en',
      FiatTypeEnum.LBP,
      [
        'LBP 123.45',
        'LBP 1,234.45',
        'LBP 123,456',
        'LBP 123,456',
        'LBP 123.45M',
        'LBP 123.45B',
        'LBP 123,456,789.45',
        'LBP 0.123',
        'LBP 0.0123',
        'LBP 0.00123',
        'LBP 0.000123',
        'LBP 0.0000123',
        'LBP 0.00000123',
        '<LBP 0.000001'
      ]
    ],
    [
      'hi-IN',
      FiatTypeEnum.INR,
      [
        '₹123.45',
        '₹1,234.45',
        '₹1,23,456',
        '₹1,23,456',
        '₹12.34 क॰',
        '₹1.23 ख॰',
        '₹12,34,56,789.45',
        '₹0.123',
        '₹0.0123',
        '₹0.00123',
        '₹0.000123',
        '₹0.0000123',
        '₹0.00000123',
        '<₹0.000001'
      ]
    ],
    [
      'en-US',
      FiatTypeEnum.BHD,
      [
        'BHD 123.45',
        'BHD 1,234.45',
        'BHD 123,456',
        'BHD 123,456',
        'BHD 123.45M',
        'BHD 123.45B',
        'BHD 123,456,789.45',
        'BHD 0.123',
        'BHD 0.0123',
        'BHD 0.00123',
        'BHD 0.000123',
        'BHD 0.0000123',
        'BHD 0.00000123',
        '<BHD 0.000001'
      ]
    ]
  ]

  it.each(scenarios)('formats the number in %s format', async (locale, fiat, expected) => {
    const { result } = setup({ locale, fiat })

    expect(result.current.deviceLocale).toBe(locale)
    expect(result.current.number.toFiat(123.456)).toBe(expected[0])
    expect(result.current.number.toFiat(1234.456)).toBe(expected[1])
    expect(result.current.number.toFiat(123456.456)).toBe(expected[2])
    expect(result.current.number.toFiat(123456.656)).toBe(expected[3])
    expect(result.current.number.toFiat(123456789.456)).toBe(expected[4])
    expect(result.current.number.toFiat(123456789876.456)).toBe(expected[5])
    expect(result.current.number.toFiat(123456789.456, { notation: 'standard' })).toBe(expected[6])
    // using ...1239 here to prove truncation instead of rounding
    expect(result.current.number.toFiat(0.1239)).toBe(expected[7])
    expect(result.current.number.toFiat(0.01239)).toBe(expected[8])
    expect(result.current.number.toFiat(0.001239)).toBe(expected[9])
    expect(result.current.number.toFiat(0.0001239)).toBe(expected[10])
    expect(result.current.number.toFiat(0.00001239)).toBe(expected[11])
    expect(result.current.number.toFiat(0.000001239)).toBe(expected[12])
    expect(result.current.number.toFiat(0.0000001239)).toBe(expected[13])
  })

  describe('localeParts', () => {
    it.each([
      [
        'en',
        FiatTypeEnum.EUR,
        {
          decimal: '.',
          fraction: 2,
          group: ',',
          groupSize: 3,
          prefix: '€',
          postfix: '',
          secondaryGroupSize: 3
        }
      ],
      [
        'es',
        FiatTypeEnum.EUR,
        {
          decimal: ',',
          fraction: 2,
          group: '.',
          groupSize: 3,
          prefix: '',
          postfix: ' €',
          secondaryGroupSize: 3
        }
      ],
      [
        'en',
        FiatTypeEnum.BHD,
        {
          decimal: '.',
          fraction: 3,
          group: ',',
          groupSize: 3,
          prefix: 'BHD ',
          postfix: '',
          secondaryGroupSize: 3
        }
      ]
    ])('should get locale parts for %s (%s)', async (locale, fiat, expected) => {
      const { result } = setup({ locale, fiat })

      expect(result.current.number.localeParts).toMatchObject(expected)
    })

    it('should default to en/USD', async () => {
      const { result } = setup({ fiat: FiatTypeEnum.USD })

      expect(result.current.number.localeParts).toMatchObject({
        decimal: '.',
        fraction: 2,
        group: ',',
        groupSize: 3,
        prefix: '$',
        postfix: '',
        secondaryGroupSize: 3
      })
    })

    it('should return the default en-US if the currency is invalid/undefined', async () => {
      // @ts-ignore
      const { result } = setup({})
      expect(result.current.deviceLocale).toBe('en-US')
      expect(result.current.number.toFiat(123.456)).toBe('$123.45')
    })
  })

  describe('toParts', () => {
    const scenarios: [string, FiatParts][] = [
      ['$1.000,00', { number: '1.000,00', prefix: '$', postfix: '' }],
      ['0.01 BTC', { number: '0.01', prefix: '', postfix: 'BTC' }],
      ['10 $', { number: '10', prefix: '', postfix: '$' }],
      ['10.52$', { number: '10.52', prefix: '', postfix: '$' }],
      ['$10.52', { number: '10.52', prefix: '$', postfix: '' }],
      ['50.00%', { number: '50.00', prefix: '', postfix: '%' }],
      ['42.3 1INCH', { number: '42.3', prefix: '', postfix: '1INCH' }],
      ['5 1INCH', { number: '5', prefix: '', postfix: '1INCH' }]
    ]
    it.each(scenarios)('correctly parses %s parts', async (input, expected) => {
      const { result } = setup({ locale: 'en-US', fiat: FiatTypeEnum.USD })
      expect(result.current.number.toParts(input)).toStrictEqual(expected)
    })
  })

  describe('toCryptoInput', () => {
    const scenarios: [{ number: NumberValue; symbol?: string }, string][] = [
      [{ number: 12.3 }, '12.3 BTC'],
      [{ number: '0.066044968372961102', symbol: 'ETH' }, '0.06604497 ETH'],
      [{ number: 12, symbol: '1INCH' }, '12 1INCH']
    ]

    it.each(scenarios)('parses %p and returns %s', async ({ number, symbol }, expected) => {
      const { result } = setup({ locale: 'en-US', fiat: FiatTypeEnum.USD })

      expect(result.current.number.toCryptoInput(number, symbol)).toEqual(expected)
    })
  })
})
