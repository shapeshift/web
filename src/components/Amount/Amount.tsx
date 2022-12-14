import type { TextProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { RawText } from 'components/Text'
import type { NumberFormatOptions } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { fromBaseUnit } from 'lib/math'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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

const FromBaseUnit = (props: CryptoAmountProps & { assetId: AssetId }) => {
  const assets = useAppSelector(selectAssets)
  const precisionValue = useMemo(
    () => fromBaseUnit(props.value, assets[props.assetId]?.precision ?? '0'),
    [assets, props.assetId, props.value],
  )

  return <Crypto {...props} value={precisionValue} />
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
Amount.FromBaseUnit = FromBaseUnit
Amount.Fiat = Fiat
Amount.Percent = Percent
