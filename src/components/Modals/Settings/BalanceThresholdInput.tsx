import type { InputProps } from '@chakra-ui/react'
import { Icon, Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaGreaterThanEqual } from 'react-icons/fa'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'

import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import {
  allowedDecimalSeparators,
  preferences,
} from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const InputComponent = (props: InputProps) => (
  <Input
    size='sm'
    borderRadius={10}
    pl={6}
    type='number'
    variant='filled'
    textAlign='right'
    {...props}
  />
)

export const BalanceThresholdInput = () => {
  const balanceThresholdUserCurrency = useAppSelector(
    preferences.selectors.selectBalanceThresholdUserCurrency,
  )
  const dispatch = useAppDispatch()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const handleChange = useCallback(
    ({ value }: NumberFormatValues) => {
      dispatch(preferences.actions.setBalanceThreshold({ threshold: value }))
    },
    [dispatch],
  )
  return (
    <InputGroup alignItems='center' justifyContent='space-between' width='100px'>
      <InputLeftElement fontSize='12px' height='100%' pointerEvents='none'>
        <Icon as={FaGreaterThanEqual} color={useColorModeValue('blue.500', 'blue.300')} />
      </InputLeftElement>
      <NumericFormat
        inputMode='decimal'
        thousandSeparator={localeParts.group}
        decimalSeparator={localeParts.decimal}
        customInput={InputComponent}
        allowedDecimalSeparators={allowedDecimalSeparators}
        valueIsNumericString={true}
        value={balanceThresholdUserCurrency}
        prefix={localeParts.prefix}
        onValueChange={handleChange}
      />
    </InputGroup>
  )
}
