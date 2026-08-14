import type { TextProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import { BigAmount } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import { RawText } from '@/components/Text'
import type { NumberFormatOptions } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'

export type AmountProps = {
  value: number | string | BigAmount | undefined
  prefix?: string
  suffix?: string
  omitDecimalTrailingZeros?: boolean
  abbreviated?: boolean
  truncateLargeNumbers?: boolean
  maximumFractionDigits?: number
  noSpace?: boolean
} & TextProps

export function Amount({
  value,
  prefix = '',
  suffix = '',
  maximumFractionDigits,
  omitDecimalTrailingZeros = false,
  abbreviated = false,
  noSpace = false,
  ...props
}: any): React.ReactElement {
  const {
    number: { toString },
  } = useLocaleFormatter()

  const resolvedValue = BigAmount.isBigAmount(value) ? value.toPrecision() : value

  return (
    <RawText {...props}>
      {prefix && `${prefix}${noSpace ? '' : ' '}`}
      {toString(resolvedValue, { maximumFractionDigits, omitDecimalTrailingZeros, abbreviated })}
      {suffix && `${noSpace ? '' : ' '}${suffix}`}
    </RawText>
  )
}

type CryptoAmountProps = {
  value: string | BigAmount | undefined
  symbol: string
  maximumFractionDigits?: number
} & AmountProps

type FiatAmountProps = {
  fiatType?: string
} & AmountProps

type FiatBaseProps = FiatAmountProps & {
  /** Fall back to the currency's minor units rather than scaling digits to the value's magnitude */
  defaultToMinorUnits?: boolean
}

type PercentAmountProps = AmountProps & {
  options?: NumberFormatOptions
  autoColor?: boolean
}

const Crypto = ({
  value,
  symbol,
  maximumFractionDigits = 8,
  prefix,
  suffix,
  omitDecimalTrailingZeros = false,
  abbreviated = false,
  truncateLargeNumbers = false,
  noSpace = false,
  ...props
}: CryptoAmountProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const resolvedValue = BigAmount.isBigAmount(value) ? value.toPrecision() : value
  const crypto = toCrypto(bnOrZero(resolvedValue), symbol, {
    maximumFractionDigits,
    omitDecimalTrailingZeros,
    abbreviated,
    truncateLargeNumbers,
  })

  return (
    <RawText {...props}>
      {prefix && `${prefix}${noSpace ? '' : ' '}`}
      {crypto}
      {suffix && `${noSpace ? '' : ' '}${suffix}`}
    </RawText>
  )
}

const FiatBase = ({
  value,
  fiatType,
  prefix,
  suffix,
  maximumFractionDigits,
  defaultToMinorUnits = false,
  omitDecimalTrailingZeros = false,
  abbreviated = false,
  noSpace = false,
  ...props
}: FiatBaseProps) => {
  const {
    number: { toFiat, localeParts },
  } = useLocaleFormatter({ fiatType })

  // The currency's minor units - cents for USD, none for JPY, three for KWD
  const resolvedMaximumFractionDigits =
    maximumFractionDigits ?? (defaultToMinorUnits ? localeParts.fraction : undefined)

  const resolvedValue = BigAmount.isBigAmount(value) ? value.toPrecision() : value
  const fiat = toFiat(bnOrZero(resolvedValue).toFixed(), {
    fiatType,
    omitDecimalTrailingZeros,
    abbreviated,
    maximumFractionDigits: resolvedMaximumFractionDigits,
  })

  return (
    <RawText {...props}>
      {prefix && `${prefix}${noSpace ? '' : ' '}`}
      {fiat}
      {suffix && `${noSpace ? '' : ' '}${suffix}`}
    </RawText>
  )
}

const Percent = ({ value, autoColor, options, prefix, suffix, ...props }: PercentAmountProps) => {
  const {
    number: { toPercent },
  } = useLocaleFormatter()
  const resolvedValue = BigAmount.isBigAmount(value) ? value.toPrecision() : value
  const formattedNumber = toPercent(bnOrZero(resolvedValue).toFixed(), options)
  const red = useColorModeValue('red.800', 'red.500')
  const green = useColorModeValue('green.500', 'green.200')
  const color = useMemo(() => {
    const roundedValue = parseFloat(formattedNumber)
    if (roundedValue === 0) {
      return green
    }
    if (roundedValue > 0) {
      return green
    }
    return red
  }, [formattedNumber, green, red])

  return (
    <RawText color={autoColor ? color : 'inherit'} {...props}>
      {prefix && `${prefix} `}
      {formattedNumber}
      {suffix && ` ${suffix}`}
    </RawText>
  )
}

/** An amount someone holds, which reads in the currency's minor units */
const Fiat = (props: FiatAmountProps): React.ReactElement => (
  <FiatBase {...props} defaultToMinorUnits />
)

/** A quoted price, which scales its digits to the magnitude rather than rounding to minor units */
const Price = (props: FiatAmountProps): React.ReactElement => <FiatBase {...props} />

Amount.Crypto = Crypto
Amount.Fiat = Fiat
Amount.Price = Price
Amount.Percent = Percent
