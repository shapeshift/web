import type { InputProps } from '@chakra-ui/react'
import { Input } from '@chakra-ui/react'
import { useCallback, useRef } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { allowedDecimalSeparators } from 'state/slices/preferencesSlice/preferencesSlice'

const CryptoInput = (props: InputProps) => {
  const translate = useTranslate()
  return (
    <Input
      size='lg'
      fontSize='xl'
      borderRadius={0}
      py={0}
      height='auto'
      type='number'
      textAlign='left'
      variant='inline'
      placeholder={translate('common.enterAmount')}
      autoComplete='off'
      {...props}
    />
  )
}

type FeeInputProps = {
  isFiat?: boolean
  onChange?: (value: string, isFiat?: boolean) => void
  value?: string | number | null
}

const numberFormatDisabled = { opacity: 1, cursor: 'not-allowed' }

export const FeeInput: React.FC<FeeInputProps> = ({ isFiat, onChange, value }) => {
  const amountRef = useRef<string | null>(null)
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const handleOnChange = useCallback(() => {
    // onChange will send us the formatted value
    // To get around this we need to get the value from the onChange using a ref
    // Now when the max buttons are clicked the onChange will not fire
    onChange?.(amountRef.current ?? '', isFiat)
  }, [isFiat, onChange])

  const handleValueChange = useCallback((values: NumberFormatValues) => {
    // This fires anytime value changes including setting it on max click
    // Store the value in a ref to send when we actually want the onChange to fire
    amountRef.current = values.value
  }, [])
  return (
    <NumberFormat
      customInput={CryptoInput}
      isNumericString={true}
      _disabled={numberFormatDisabled}
      suffix={isFiat ? localeParts.postfix : ''}
      prefix={isFiat ? localeParts.prefix : ''}
      decimalSeparator={localeParts.decimal}
      inputMode='decimal'
      allowedDecimalSeparators={allowedDecimalSeparators}
      thousandSeparator={localeParts.group}
      value={value}
      onValueChange={handleValueChange}
      onChange={handleOnChange}
    />
  )
}
