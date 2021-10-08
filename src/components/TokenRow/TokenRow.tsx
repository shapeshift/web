import {
  Input,
  InputGroup,
  InputGroupProps,
  InputLeftElement,
  InputProps,
  InputRightElement
} from '@chakra-ui/react'
import { Control, Controller, ControllerProps } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'

const CryptoInput = (props: InputProps) => (
  <Input
    pr='4.5rem'
    pl='7.5rem'
    size='lg'
    type='number'
    variant='filled'
    placeholder='Enter amount'
    {...props}
  />
)

type TokenRowProps = {
  control: Control
  fieldName: string
  disabled?: boolean
  rules?: ControllerProps['rules']
  inputLeftElement?: React.ReactNode
  inputRightElement?: React.ReactNode
  onInputChange?: any
} & InputGroupProps

export const TokenRow = ({
  control,
  fieldName,
  rules,
  inputLeftElement,
  inputRightElement,
  onInputChange,
  disabled,
  ...rest
}: TokenRowProps) => {
  const {
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })

  return (
    <InputGroup size='lg' {...rest}>
      {inputLeftElement && (
        <InputLeftElement ml={1} width='auto'>
          {inputLeftElement}
        </InputLeftElement>
      )}
      <Controller
        render={({ field: { onChange, value } }) => {
          return (
            <NumberFormat
              inputMode='decimal'
              thousandSeparator={localeParts.group}
              decimalSeparator={localeParts.decimal}
              customInput={CryptoInput}
              value={value}
              disabled={disabled}
              onValueChange={e => {
                onChange(e.value)
                onInputChange && e.value !== value && onInputChange(e.value)
              }}
            />
          )
        }}
        name={fieldName}
        control={control}
        rules={rules}
        defaultValue=''
      />
      {inputRightElement && (
        <InputRightElement width='4.5rem'>{inputRightElement}</InputRightElement>
      )}
    </InputGroup>
  )
}
