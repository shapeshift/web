import type { TextProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { RawText } from 'components/Text'
import type { NumberFormatOptions } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'

export type AmountProps = {
  value: number | string | undefined
  prefix?: string
  suffix?: string
  omitDecimalTrailingZeros?: boolean
  abbreviated?: boolean
  maximumFractionDigits?: number
} & TextProps

export function Amount({
  value,
  prefix = '',
  suffix = '',
  maximumFractionDigits,
  omitDecimalTrailingZeros = false,
  abbreviated = false,
  ...props
}: any): React.ReactElement {
  const {
    number: { toString },
  } = useLocaleFormatter()

  return (
    <RawText {...props}>
      {prefix}
      {toString(value, { maximumFractionDigits, omitDecimalTrailingZeros, abbreviated })}
      {suffix}
    </RawText>
  )
}

type CryptoAmountProps = {
  value: string | undefined
  symbol: string
  maximumFractionDigits?: number
} & AmountProps

type FiatAmountProps = {
  fiatType?: string
} & AmountProps

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
  ...props
}: CryptoAmountProps) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const crypto = toCrypto(bnOrZero(value), symbol, {
    maximumFractionDigits,
    omitDecimalTrailingZeros,
    abbreviated,
  })

  return (
    <RawText {...props}>
      {prefix && `${prefix} `}
      {crypto}
      {suffix && ` ${suffix}`}
    </RawText>
  )
}

const Fiat = ({
  value,
  fiatType,
  prefix,
  suffix,
  maximumFractionDigits,
  omitDecimalTrailingZeros = false,
  abbreviated = false,
  ...props
}: FiatAmountProps) => {
  const {
    number: { toFiat },
  } = useLocaleFormatter({ fiatType })

  const fiat = toFiat(bnOrZero(value).toFixed(), {
    fiatType,
    omitDecimalTrailingZeros,
    abbreviated,
    maximumFractionDigits,
  })

  return (
    <RawText {...props}>
      {prefix && `${prefix} `}
      {fiat}
      {suffix && ` ${suffix}`}
    </RawText>
  )
}

const Percent = ({ value, autoColor, options, prefix, suffix, ...props }: PercentAmountProps) => {
  const {
    number: { toPercent },
  } = useLocaleFormatter()
  const formattedNumber = toPercent(bnOrZero(value).toFixed(), options)
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

Amount.Crypto = Crypto
Amount.Fiat = Fiat
Amount.Percent = Percent
