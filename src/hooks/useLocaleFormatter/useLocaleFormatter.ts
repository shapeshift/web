import truncate from 'lodash/truncate'
import { useCallback, useMemo } from 'react'

import type { BigNumber } from '@/lib/bignumber/bignumber'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getFiatNumberFractionDigits } from '@/lib/getFiatNumberFractionDigits/getFiatNumberFractionDigits'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

const CRYPTO_PRECISION = 8
const MAXIMUM_LARGE_NUMBER_CHARS = 18

export type NumberValue = number | string
export type DateValue = number | string | Date

type GroupSeparator = ',' | '.' | ' '
type DecimalSeparator = ',' | '.'
type LocaleParts = {
  group: GroupSeparator /* thousands group separation character */
  decimal: DecimalSeparator /* decimal separation character */
  fraction: number /* number of decimal places */
  groupSize: number
  secondaryGroupSize: number
  prefix: string
  postfix: string
}

export type NumberFormatOptions = {
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  notation?: 'compact' | 'standard' | 'scientific' | 'engineering'
  fiatType?: string
  abbreviated?: boolean
  omitDecimalTrailingZeros?: boolean
  truncateLargeNumbers?: boolean
}

export type NumberFormatter = {
  deviceLocale: string
  number: {
    localeParts: LocaleParts
    toCrypto: (number: BigNumber.Value, symbol?: string, options?: NumberFormatOptions) => string
    toFiat: (number: NumberValue, options?: NumberFormatOptions) => string
    toPercent: (number: NumberValue, options?: NumberFormatOptions) => string
    toString: (number: NumberValue, options?: NumberFormatOptions) => string
  }
  date: {
    toDateTime: (date: DateValue, options?: Intl.DateTimeFormatOptions) => string
    toShortDate: (date: DateValue) => string
  }
}

const toNumber = (number: string | number): number => Number(number) || 0
const toDate = (date: DateValue): Date | null => {
  if (!date) return null
  const newDate = new Date(date)
  return isNaN(newDate.valueOf()) ? null : newDate
}

const getCurrencyParts = (parts: Intl.NumberFormatPart[], end = false) => {
  let currency = ''
  for (const part of parts.slice(end ? -2 : 0, end ? undefined : 2)) {
    if (['currency', 'literal'].includes(part.type)) currency += part.value
  }
  return currency
}

const getParts = (locale: string, fiatType = 'USD') => {
  if (!Intl) {
    throw new Error('Intl library is required')
  }

  const result: LocaleParts = {
    decimal: '.',
    group: ',',
    fraction: 2,
    groupSize: 3,
    secondaryGroupSize: 3,
    prefix: '$',
    postfix: '',
  }

  try {
    // Determine the localization parts
    const groupFormatter = new Intl.NumberFormat(locale, {
      currency: fiatType,
      style: 'currency',
      useGrouping: true,
    })
    const parts = groupFormatter.formatToParts(1234567.1234567890123456789)
    const groups = parts.filter(p => p.type === 'integer')

    // @TODO: Do we want to support non-arabic numerals?
    // @see axiom/packages/numbers

    result.prefix = getCurrencyParts(parts)
    result.postfix = getCurrencyParts(parts, true)
    result.decimal = (parts.find(d => d.type === 'decimal')?.value ?? '.') as DecimalSeparator
    result.group = (parts.find(d => d.type === 'group')?.value ?? ',') as GroupSeparator
    result.fraction = parts.find(d => d.type === 'fraction')?.value?.length ?? 2
    result.groupSize = groups.pop()?.value.length ?? 3
    result.secondaryGroupSize = groups.pop()?.value.length ?? 3
  } catch (e) {
    console.error(e)
  }

  return result
}

type useLocaleFormatterArgs = {
  locale?: string
  fiatType?: string
}

/**
 * Set of helper functions for formatting using the user's locale
 * such as numbers, currencies, and dates
 */

export const useLocaleFormatter = (args?: useLocaleFormatterArgs): NumberFormatter => {
  const currencyFormat = useAppSelector(preferences.selectors.selectCurrencyFormat)
  const deviceLocale = args?.locale ?? currencyFormat
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const fiatTypeToUse = args?.fiatType ?? selectedCurrency
  /**
   * Parse a number in the current locale formatted in the selected currency.
   * This will determine the thousandth group separator, decimal separator, and minor units
   */
  const localeParts = useMemo((): LocaleParts => {
    return getParts(deviceLocale, fiatTypeToUse)
  }, [fiatTypeToUse, deviceLocale])

  /**
   * Helper function to abbreviate number to truncate rather than round fractions
   * @param {number} maximumFractionDigits - truncate fraction after this number of digits. Use 0 for no fraction.
   * @param omitDecimalTrailingZeros
   */
  function partsReducer(maximumFractionDigits: number, omitDecimalTrailingZeros?: boolean) {
    return (accum: string, { type, value }: Intl.NumberFormatPart) => {
      let segment = value
      if (type === 'decimal' && maximumFractionDigits === 0) segment = ''
      if (type === 'fraction') {
        segment = value.substr(0, maximumFractionDigits)
        if (omitDecimalTrailingZeros && segment && /^0*$/.test(segment)) {
          // remove trailing zeroes as well as separator character in case there are only zeroes as decimals
          return accum.slice(0, -1)
        }
      }

      return accum + segment
    }
  }

  const abbreviateNumber = useCallback(
    (number: number, fiatType?: string, options?: NumberFormatOptions) => {
      const bounds = { min: 10000, max: 1000000 }
      const longCompactDisplayLowerBound = 1_000_000_000
      const noDecimals = bounds.min <= number && number < bounds.max
      const minDisplayValue = 0.000001
      const lessThanMin = 0 < number && minDisplayValue > number
      const formatNumber = lessThanMin ? minDisplayValue : number
      const minimumFractionDigits = noDecimals ? 0 : 2
      const maximumFractionDigits = Math.max(
        minimumFractionDigits,
        lessThanMin ? 6 : getFiatNumberFractionDigits(number),
      )
      // Filter out undefined options caused by optional component props so they do not override the defaults
      const filteredOptions = options
        ? Object.fromEntries(Object.entries(options).filter(([_, value]) => value !== undefined))
        : {}
      const formatter = new Intl.NumberFormat(deviceLocale, {
        notation: number < bounds.min || noDecimals ? 'standard' : 'compact',
        compactDisplay: fiatType || number < longCompactDisplayLowerBound ? 'short' : 'long',
        style: fiatType ? 'currency' : 'decimal',
        currency: fiatType,
        minimumFractionDigits,
        // Force enough fractional digits to truncate it properly without rounding off below
        maximumFractionDigits: 10,
        ...filteredOptions,
      })

      const parts = formatter.formatToParts(formatNumber)
      return parts.reduce(
        partsReducer(maximumFractionDigits, options?.omitDecimalTrailingZeros),
        lessThanMin ? '<' : '',
      )
    },
    [deviceLocale],
  )

  /** Format a number as a crypto display value */
  const numberToCrypto = (
    num: BigNumber.Value,
    symbol = 'BTC',
    options?: NumberFormatOptions,
  ): string => {
    if (
      options?.truncateLargeNumbers &&
      bnOrZero(num).toFixed(0).length > MAXIMUM_LARGE_NUMBER_CHARS
    ) {
      return `${truncate(bnOrZero(num).toFixed(0), { length: 16, omission: '...' })} ${symbol}`
    }

    const maximumFractionDigits =
      options?.maximumFractionDigits !== undefined
        ? options.maximumFractionDigits
        : CRYPTO_PRECISION

    const formatOptions = {
      decimalSeparator: localeParts.decimal,
      groupSeparator: localeParts.group,
      groupSize: localeParts.groupSize,
      secondaryGroupSize: localeParts.secondaryGroupSize,
      suffix: ` ${symbol}`,
    }

    return bnOrZero(num).decimalPlaces(maximumFractionDigits).toFormat(formatOptions)
  }

  /** Format a number as a fiat display value */
  const numberToFiat = useCallback(
    (value: NumberValue, options?: NumberFormatOptions): string => {
      try {
        const number = toNumber(value)
        const numberFiat = options?.fiatType || fiatTypeToUse
        return abbreviateNumber(number, numberFiat, options)
      } catch (e) {
        console.error(e)
        return String(value)
      }
    },
    [abbreviateNumber, fiatTypeToUse],
  )

  const numberToPercent = (number: NumberValue, options: NumberFormatOptions = {}): string => {
    return toNumber(number).toLocaleString(deviceLocale, {
      style: 'percent',
      minimumIntegerDigits: 1,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    })
  }

  const numberToString = (number: NumberValue, options?: NumberFormatOptions): string => {
    if (options?.abbreviated) return abbreviateNumber(toNumber(number), undefined, options)
    const maximumFractionDigits = options?.maximumFractionDigits ?? 8
    return toNumber(number).toLocaleString(deviceLocale, { maximumFractionDigits })
  }

  /**
   * Convert date to a locale formatted string
   * Example: '5/12/2020, 3:20:37PM' (US) or '12.5.2020, 15:20:37' (DE)
   */
  const toDateTime = (date: DateValue, options?: Intl.DateTimeFormatOptions): string => {
    const d = toDate(date)
    if (!d) return '' // @TODO: What do we do with invalid dates?
    return d.toLocaleString(deviceLocale, options)
  }

  const toShortDate = (date: DateValue): string => {
    const d = toDate(date)
    if (!d) return '' // @TODO: What do we do with invalid dates?
    return d.toLocaleDateString(deviceLocale)
  }
  return {
    deviceLocale,
    number: {
      localeParts,
      toCrypto: numberToCrypto,
      toFiat: numberToFiat,
      toPercent: numberToPercent,
      toString: numberToString,
    },
    date: {
      toDateTime,
      toShortDate,
    },
  }
}
