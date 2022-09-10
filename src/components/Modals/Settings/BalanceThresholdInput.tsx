import type { InputProps } from '@chakra-ui/react'
import { Icon, Input, InputGroup, InputLeftElement, useColorModeValue } from '@chakra-ui/react'
import { FaGreaterThanEqual } from 'react-icons/fa'
import NumberFormat from 'react-number-format'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectBalanceThreshold } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

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
  const balanceThreshold = useAppSelector(selectBalanceThreshold)
  const dispatch = useAppDispatch()
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const onChange = (value: string) => {
    dispatch(preferences.actions.setBalanceThreshold({ threshold: value }))
  }
  return (
    <InputGroup alignItems='center' justifyContent='space-between' width='100px'>
      <InputLeftElement fontSize='12px' height='100%' pointerEvents='none'>
        <Icon as={FaGreaterThanEqual} color={useColorModeValue('blue.500', 'blue.300')} />
      </InputLeftElement>
      <NumberFormat
        inputMode='decimal'
        thousandSeparator={localeParts.group}
        decimalSeparator={localeParts.decimal}
        customInput={InputComponent}
        isNumericString={true}
        value={balanceThreshold}
        prefix={localeParts.prefix}
        onValueChange={e => {
          onChange(e.value)
        }}
      />
    </InputGroup>
  )
}
