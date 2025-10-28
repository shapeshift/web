import { Button, FormControl, HStack, Icon, Input, Text } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import type { Control, ControllerRenderProps, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { TbSwitchVertical } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'

import { Amount } from '../Amount/Amount'

import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'

export type CryptoFiatInputProps<T extends FieldValues = FieldValues> = {
  asset: Asset
  handleInputChange(inputValue: string): void
  fieldName: Path<T>
  toggleIsFiat(): void
  isFiat: boolean
  control: Control<T>
  fiatAmount?: string
  cryptoAmount?: string
}

type AmountInputProps = {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  [key: string]: any
}

// Thresholds for progressive font size reduction based on amount length
const FONT_SIZE_THRESHOLDS = {
  SMALL: 10,
  MEDIUM: 14,
  LARGE: 22,
} as const

const getFontSizeByLength = (length: number): string => {
  if (length >= FONT_SIZE_THRESHOLDS.LARGE) return '24px'
  if (length >= FONT_SIZE_THRESHOLDS.MEDIUM) return '30px'
  if (length >= FONT_SIZE_THRESHOLDS.SMALL) return '38px'
  return '65px'
}

const AmountInput = (props: AmountInputProps) => {
  const valueLength = useMemo(() => {
    return props.value ? String(props.value).length : 0
  }, [props.value])

  const fontSize = useMemo(() => {
    return getFontSizeByLength(valueLength)
  }, [valueLength])

  const lineHeight = useMemo(() => {
    return getFontSizeByLength(valueLength)
  }, [valueLength])

  return (
    <Input
      size='lg'
      fontSize={fontSize}
      lineHeight={lineHeight}
      fontWeight='normal'
      textAlign='center'
      border='none'
      borderRadius='lg'
      bg='transparent'
      variant='unstyled'
      color={props.value ? 'text.base' : 'text.subtle'}
      {...props}
    />
  )
}

export const CryptoFiatInput = <T extends FieldValues = FieldValues>({
  asset,
  handleInputChange,
  fieldName,
  isFiat,
  control,
  toggleIsFiat,
  fiatAmount,
  cryptoAmount,
}: CryptoFiatInputProps<T>) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const displayPlaceholder = isFiat ? `${localeParts.prefix}0.00` : `0.00 ${asset.symbol}`

  const handleValueChange = useCallback(
    (onChange: (value: string) => void, value: string) => (values: NumberFormatValues) => {
      onChange(values.value)
      if (values.value !== value) handleInputChange(values.value)
    },
    [handleInputChange],
  )

  const renderController = useCallback(
    ({ field: { onChange, value } }: { field: ControllerRenderProps<T, Path<T>> }) => {
      return (
        <NumberFormat
          customInput={AmountInput}
          isNumericString={true}
          decimalScale={isFiat ? localeParts.fraction : asset.precision}
          inputMode='decimal'
          thousandSeparator={localeParts.group}
          decimalSeparator={localeParts.decimal}
          allowedDecimalSeparators={allowedDecimalSeparators}
          allowNegative={false}
          allowLeadingZeros={false}
          value={value}
          placeholder={displayPlaceholder}
          prefix={isFiat ? localeParts.prefix : ''}
          onValueChange={handleValueChange(onChange, value)}
        />
      )
    },
    [
      asset?.precision,
      isFiat,
      localeParts.fraction,
      localeParts.decimal,
      localeParts.group,
      localeParts.prefix,
      displayPlaceholder,
      handleValueChange,
    ],
  )

  return (
    <FormControl>
      <Controller key={fieldName} name={fieldName} control={control} render={renderController} />
      <HStack justify='center' mt={2} spacing={2} onClick={toggleIsFiat}>
        <Text fontSize='sm' color='text.subtle'>
          {isFiat ? (
            <Amount.Crypto value={cryptoAmount} symbol={asset.symbol} />
          ) : (
            <Amount.Fiat value={bnOrZero(fiatAmount).toFixed(2)} />
          )}
        </Text>
        <Button variant='ghost' size='sm' p={1} minW='auto' h='auto'>
          <Icon as={TbSwitchVertical} fontSize='xs' color='text.subtle' />
        </Button>
      </HStack>
    </FormControl>
  )
}
