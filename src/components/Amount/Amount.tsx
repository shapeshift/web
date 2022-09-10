import type { TextProps } from '@chakra-ui/react'
import { useMemo } from 'react'
import { RawText } from 'components/Text'
import type { NumberFormatOptions } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'

type AmountProps = {
  value: number | string
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
  value: string
  symbol: string
  cryptoSymbolStyle?: TextProps
  maximumFractionDigits?: number
} & AmountProps

type FiatAmountProps = {
  fiatSymbolStyle?: TextProps
  fiatType?: string
} & AmountProps

type PercentAmountProps = AmountProps & {
  options?: NumberFormatOptions
  autoColor?: boolean
}

const Crypto = ({
  value,
  symbol,
  cryptoSymbolStyle,
  maximumFractionDigits = 8,
  prefix,
  suffix,
  omitDecimalTrailingZeros = false,
  ...props
}: CryptoAmountProps) => {
  const {
    number: { toCrypto, toParts },
  } = useLocaleFormatter()

  const crypto = toCrypto(value, symbol, { maximumFractionDigits, omitDecimalTrailingZeros })

  if (!cryptoSymbolStyle) {
    return (
      <RawText {...props}>
        {prefix && `${prefix} `}
        {crypto}
        {suffix && ` ${suffix}`}
      </RawText>
    )
  }

  const parts = toParts(crypto)

  return (
    <RawText {...props}>
      {parts.prefix && (
        <RawText {...props} {...cryptoSymbolStyle}>
          {parts.prefix}
        </RawText>
      )}
      {parts.number}
      {parts.postfix && (
        <RawText {...props} {...cryptoSymbolStyle}>
          {parts.postfix}
        </RawText>
      )}
    </RawText>
  )
}

const Fiat = ({
  value,
  fiatSymbolStyle,
  fiatType,
  prefix,
  suffix,
  maximumFractionDigits,
  omitDecimalTrailingZeros = false,
  abbreviated = false,
  ...props
}: FiatAmountProps) => {
  const {
    number: { toFiat, toParts },
  } = useLocaleFormatter({ fiatType })

  const fiat = toFiat(value, {
    fiatType,
    omitDecimalTrailingZeros,
    abbreviated,
    maximumFractionDigits,
  })

  if (!fiatSymbolStyle) {
    return (
      <RawText {...props}>
        {prefix && `${prefix} `}
        {fiat}
        {suffix && ` ${suffix}`}
      </RawText>
    )
  }

  const parts = toParts(fiat)

  return (
    <RawText {...props}>
      {parts.prefix && (
        <RawText {...props} {...fiatSymbolStyle}>
          {parts.prefix}
        </RawText>
      )}
      {parts.number}
      {parts.postfix && (
        <RawText {...props} {...fiatSymbolStyle}>
          {parts.postfix}
        </RawText>
      )}
    </RawText>
  )
}

const Percent = ({ value, autoColor, options, prefix, suffix, ...props }: PercentAmountProps) => {
  const {
    number: { toPercent },
  } = useLocaleFormatter()
  const formattedNumber = toPercent(value, options)

  const color = useMemo(() => {
    const roundedValue = parseFloat(formattedNumber)
    if (roundedValue === 0) {
      return 'gray.500'
    }
    if (roundedValue > 0) {
      return 'green.500'
    }
    return 'red.500'
  }, [formattedNumber])

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
