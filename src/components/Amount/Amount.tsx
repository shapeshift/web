import { TextProps } from '@chakra-ui/react'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'

type AmountProps = {
  value: number | string
} & TextProps

export function Amount({
  value,
  prefix = '',
  suffix = '',
  maximumFractionDigits,
  ...props
}: any): React.ReactElement {
  const {
    number: { toString }
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

const Crypto = ({
  value,
  symbol,
  cryptoSymbolStyle,
  maximumFractionDigits = 8,
  ...props
}: CryptoAmountProps) => {
  const {
    number: { toCrypto, toParts }
  } = useLocaleFormatter({ fiatType: 'USD' })

  const crypto = toCrypto(value, symbol, { maximumFractionDigits })

  if (!cryptoSymbolStyle) {
    return <RawText {...props}>{crypto}</RawText>
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
          {' '}
          {parts.postfix}
        </RawText>
      )}
    </RawText>
  )
}

const Fiat = ({ value, fiatSymbolStyle, fiatType, ...props }: FiatAmountProps) => {
  const {
    number: { toFiat, toParts }
  } = useLocaleFormatter({ fiatType: fiatType || 'USD' })

  const fiat = toFiat(value, { fiatType })

  if (!fiatSymbolStyle) {
    return <RawText {...props}>{fiat}</RawText>
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

Amount.Crypto = Crypto
Amount.Fiat = Fiat
