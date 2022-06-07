import { TextProps } from '@chakra-ui/react'
import { useMemo } from 'react'
import { RawText } from 'components/Text'
import {
  NumberFormatOptions,
  useLocaleFormatter,
} from 'hooks/useLocaleFormatter/useLocaleFormatter'

type AmountProps = {
  value: number | string
  prefix?: string
  suffix?: string
} & TextProps

export function Amount({
  value,
  prefix = '',
  suffix = '',
  maximumFractionDigits,
  ...props
}: any): React.ReactElement {
  const {
    number: { toString },
  } = useLocaleFormatter({ fiatType: 'USD' })

  return (
    <RawText {...props}>
      {prefix}
      {toString(value, { maximumFractionDigits })}
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
  ...props
}: CryptoAmountProps) => {
  const {
    number: { toCrypto, toParts },
  } = useLocaleFormatter({ fiatType: 'USD' })

  const crypto = toCrypto(value, symbol, { maximumFractionDigits })

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

const Fiat = ({ value, fiatSymbolStyle, fiatType, prefix, suffix, ...props }: FiatAmountProps) => {
  const {
    number: { toFiat, toParts },
  } = useLocaleFormatter({ fiatType: fiatType || 'USD' })

  const fiat = toFiat(value, { fiatType })

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

const Percent = ({ value, autoColor, options, ...props }: PercentAmountProps) => {
  const {
    number: { toPercent },
  } = useLocaleFormatter({ fiatType: 'USD' })
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
      {formattedNumber}
    </RawText>
  )
}

const Supply = ({ value, ...props }: AmountProps) => {
  const {
    number: { toSupply },
  } = useLocaleFormatter({ fiatType: 'USD' })

  const volume = toSupply(value)

  return <RawText {...props}>{volume}</RawText>
}

Amount.Crypto = Crypto
Amount.Fiat = Fiat
Amount.Percent = Percent
Amount.Supply = Supply
