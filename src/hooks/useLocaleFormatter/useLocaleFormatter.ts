import { useCallback, useMemo } from 'react'
import { getFiatNumberFractionDigits } from 'lib/getFiatNumberFractionDigits/getFiatNumberFractionDigits'

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
  notation?: string
  compactDisplay?: string
  fiatType?: string
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
    toPercent: (number: NumberValue) => string
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
    postfix: ''
  }

  try {
    // Determine the localization parts
    const groupFormatter = new Intl.NumberFormat(locale, {
      currency: fiatType,
      style: 'currency',
      useGrouping: true
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
    // @TODO: figure out logging
    console.error(e)
  }

  return result
}

export const getBrowserLocales = (options = {}) => {
  const defaultOptions = {
    languageCodeOnly: false
  }

  const opt = {
    ...defaultOptions,
    ...options
  }

  const browserLocales =
    navigator.languages === undefined ? [navigator.language] : navigator.languages

  if (!browserLocales) {
    // default to english if browser does not support
    return 'en-US'
  }

  return browserLocales.map(locale => {
    const trimmedLocale = locale.trim()

    return opt.languageCodeOnly ? trimmedLocale.split(/[-_]/)[0] : trimmedLocale
  })[0]
}

/**
 * Set of helper functions for formatting using the user's locale
 * such as numbers, currencies, and dates
 */

export const useLocaleFormatter = ({
  locale,
  fiatType = 'USD'
}: {
  locale?: string
  fiatType: string
}): NumberFormatter => {
  const deviceLocale = locale ?? getBrowserLocales()

  /**
   * Parse a number in the current locale formatted in the selected currency.
   * This will determine the thousandth group separator, decimal separator, and minor units
   */
  const localeParts = useMemo((): LocaleParts => {
    return getParts(deviceLocale, fiatType)
  }, [fiatType, deviceLocale])

  /**
   * Parse a formatted number string into a prefix, number, and postfix
   * Example inputs: $1.000,00, 0.01 BTC, 10 $, 50.00%
   */
  const numberToParts = (value: string): FiatParts => {
    const parts = parseString.exec(value)

    return {
      number: parts?.[2],
      prefix: parts?.[1],
      postfix: parts?.[3]?.trim()
    }
  }

  /**
   * Helper function to abbreviate number to truncate rather than round fractions
   * @param {number} maximumFractionDigits - truncate fraction after this number of digits. Use 0 for no fraction.
   */
  function partsReducer(maximumFractionDigits: number) {
    return (accum: string, { type, value }: Intl.NumberFormatPart) => {
      let segment = value
      if (type === 'decimal' && maximumFractionDigits === 0) segment = ''
      if (type === 'fraction') {
        segment = value.substr(0, maximumFractionDigits)
      }
      return accum + segment
    }
  }

  const abbreviateNumber = (number: number, fiatType: string, options?: NumberFormatOptions) => {
    const bounds = { min: 10000, max: 1000000 }
    const noDecimals = bounds.min <= number && number < bounds.max
    const minDisplayValue = 0.000001
    const lessThanMin = 0 < number && minDisplayValue > number
    const formatNumber = lessThanMin ? minDisplayValue : number
    const minimumFractionDigits = noDecimals ? 0 : 2
    const maximumFractionDigits = Math.max(
      minimumFractionDigits,
      lessThanMin ? 6 : getFiatNumberFractionDigits(number)
    )
    const formatter = new Intl.NumberFormat(deviceLocale, {
      notation: number < bounds.min || noDecimals ? 'standard' : 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: fiatType,
      minimumFractionDigits,
      maximumFractionDigits: 10,
      ...options
    })

    const parts = formatter.formatToParts(formatNumber)
    return parts.reduce(partsReducer(maximumFractionDigits), lessThanMin ? '<' : '')
  }

  /** If the number that is being formatted has a trailing decimal, add it back to the formatted number */
  const showTrailingDecimal = useCallback(
    (num: NumberValue, formattedNum: string): string => {
      const parts = numberToParts(formattedNum)
      const numHasDecimal = String(num).includes('.')
      const decimalWasRemoved = !parts?.number?.includes(localeParts.decimal)
      if (numHasDecimal && decimalWasRemoved) {
        parts.number = parts.number + localeParts.decimal
      }
      return `${parts.prefix}${parts.number} ${parts.postfix}`
    },
    [localeParts]
  )

  /** Format a number as a crypto display value */
  const numberToCrypto = (
    num: NumberValue,
    symbol = 'BTC',
    options?: NumberFormatOptions
  ): string => {
    return `${toNumber(num).toLocaleString(deviceLocale, {
      maximumFractionDigits: CRYPTO_PRECISION,
      ...options
    })} ${symbol}`
  }

  /**
   * Format a number as a crypto input value.
   * This shows any trailing decimals and zeros as the user is typing in their number
   */
  const numberToCryptoInput = (
    num: NumberValue,
    symbol = 'BTC',
    options?: NumberFormatOptions
  ): string => {
    const fractionDigits = (String(num).split('.')?.[1] ?? '').length
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
        const numberFiat = options?.fiatType || fiatType
        return abbreviateNumber(number, numberFiat, options)
      } catch (e) {
        // @TODO: figure out logging
        console.error(e)
        return String(value)
      }
    },
    [fiatType, deviceLocale] // eslint-disable-line react-hooks/exhaustive-deps
  )

  /**
   * Format a number as a crypto input value.
   * This shows any trailing decimals and zeros as the user is typing in their number
   */
  const numberToFiatInput = useCallback(
    (num: NumberValue, options?: NumberFormatOptions): string => {
      try {
        const { fraction } = localeParts
        const fractionDigits = (String(num).split('.')?.[1] ?? '').length
        const minimumFractionDigits = Math.min(fractionDigits, fraction)
        const fiat = numberToFiat(num, { ...options, minimumFractionDigits })
        return showTrailingDecimal(num, fiat)
      } catch (e) {
        // @TODO: figure out logging
        console.error(e)
        return String(num)
      }
    },
    [localeParts, numberToFiat] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const numberToPercent = (number: NumberValue): string => {
    return toNumber(number).toLocaleString(deviceLocale, {
      style: 'percent',
      minimumIntegerDigits: 1,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const numberToString = (number: NumberValue, options?: NumberFormatOptions): string => {
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
      toString: numberToString
    },
    date: {
      toDateTime,
      toShortDate
    }
  }
}
