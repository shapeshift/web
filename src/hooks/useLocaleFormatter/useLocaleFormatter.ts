import { useCallback, useMemo } from 'react'
import { getFiatNumberFractionDigits } from 'lib/getFiatNumberFractionDigits/getFiatNumberFractionDigits'
import { selectCurrencyFormat, selectSelectedCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const CRYPTO_PRECISION = 8

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

export type FiatParts = {
  number?: string
  prefix?: string
  postfix?: string
}

export type NumberFormatOptions = {
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  notation?: 'compact' | 'standard' | 'scientific' | 'engineering'
  fiatType?: string
  abbreviated?: boolean
  omitDecimalTrailingZeros?: boolean
}

export type NumberFormatter = {
  deviceLocale: string
  number: {
    localeParts: LocaleParts
    toCrypto: (number: NumberValue, symbol?: string, options?: NumberFormatOptions) => string
    toCryptoInput: (number: NumberValue, symbol?: string, options?: NumberFormatOptions) => string
    toFiat: (number: NumberValue, options?: NumberFormatOptions) => string
    toFiatInput: (number: NumberValue, options?: NumberFormatOptions) => string
    toParts: (value: string) => FiatParts
    toPercent: (number: NumberValue, options?: NumberFormatOptions) => string
    toString: (number: NumberValue, options?: NumberFormatOptions) => string
  }
  date: {
    toDateTime: (date: DateValue, options?: Intl.DateTimeFormatOptions) => string
    toShortDate: (date: DateValue) => string
  }
}

const parseString = /(\D*)([\d|.,]+)(.*)/
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
  const currencyFormat = useAppSelector(selectCurrencyFormat)
  const deviceLocale = args?.locale ?? currencyFormat
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const fiatTypeToUse = args?.fiatType ?? selectedCurrency
  /**
   * Parse a number in the current locale formatted in the selected currency.
   * This will determine the thousandth group separator, decimal separator, and minor units
   */
  const localeParts = useMemo((): LocaleParts => {
    return getParts(deviceLocale, fiatTypeToUse)
  }, [fiatTypeToUse, deviceLocale])

  /**
   * Parse a formatted number string into a prefix, number, and postfix
   * Example inputs: $1.000,00, 0.01 BTC, 10 $, 50.00%
   */
  const numberToParts = (value: string): FiatParts => {
    const parts = parseString.exec(value)

    return {
      number: parts?.[2],
      prefix: parts?.[1],
      postfix: parts?.[3]?.trim(),
    }
  }

  /**
   * Helper function to abbreviate number to truncate rather than round fractions
   * @param {number} maximumFractionDigits - truncate fraction after this number of digits. Use 0 for no fraction.
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

  /** If the number that is being formatted has a trailing decimal, add it back to the formatted number */
  const showTrailingDecimal = useCallback(
    (num: NumberValue, formattedNum: string): string => {
      const parts = numberToParts(formattedNum)
      const numHasDecimal = String(num).includes(localeParts.decimal)
      const decimalWasRemoved = !parts?.number?.includes(localeParts.decimal)
      if (numHasDecimal && decimalWasRemoved) {
        parts.number = parts.number + localeParts.decimal
      }
      return `${parts.prefix}${parts.number} ${parts.postfix}`
    },
    [localeParts],
  )

  /** Format a number as a crypto display value */
  const numberToCrypto = (
    num: NumberValue,
    symbol = 'BTC',
    options?: NumberFormatOptions,
  ): string => {
    return `${toNumber(num).toLocaleString(deviceLocale, {
      maximumFractionDigits: CRYPTO_PRECISION,
      ...options,
    })} ${symbol}`
  }

  /**
   * Format a number as a crypto input value.
   * This shows any trailing decimals and zeros as the user is typing in their number
   */
  const numberToCryptoInput = (
    num: NumberValue,
    symbol = 'BTC',
    options?: NumberFormatOptions,
  ): string => {
    const fractionDigits = (String(num).split(localeParts.decimal)?.[1] ?? '').length
    const minimumFractionDigits =
      fractionDigits < CRYPTO_PRECISION ? fractionDigits : CRYPTO_PRECISION
    const crypto = numberToCrypto(num, symbol, { ...options, minimumFractionDigits })
    return showTrailingDecimal(num, crypto)
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

  /**
   * Format a number as a crypto input value.
   * This shows any trailing decimals and zeros as the user is typing in their number
   */
  const numberToFiatInput = useCallback(
    (num: NumberValue, options?: NumberFormatOptions): string => {
      try {
        const { fraction } = localeParts
        const fractionDigits = (String(num).split(localeParts.decimal)?.[1] ?? '').length
        const minimumFractionDigits = Math.min(fractionDigits, fraction)
        const fiat = numberToFiat(num, { ...options, minimumFractionDigits })
        return showTrailingDecimal(num, fiat)
      } catch (e) {
        console.error(e)
        return String(num)
      }
    },
    [localeParts, numberToFiat, showTrailingDecimal],
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
      toCryptoInput: numberToCryptoInput,
      toFiat: numberToFiat,
      toFiatInput: numberToFiatInput,
      toParts: numberToParts,
      toPercent: numberToPercent,
      toString: numberToString,
    },
    date: {
      toDateTime,
      toShortDate,
    },
  }
}
