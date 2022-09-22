import type { InputGroupProps, InputProps } from '@chakra-ui/react'
import { Input, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react'
import type { Control, ControllerProps, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'
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

type TokenRowProps<C extends FieldValues> = {
  control: Control<C>
  fieldName: Path<C>
  disabled?: boolean
  rules?: ControllerProps['rules']
  inputLeftElement?: React.ReactNode
  inputRightElement?: React.ReactNode
  onInputChange?: any
} & InputGroupProps

export function TokenRow<C extends FieldValues>({
  control,
  fieldName,
  rules,
  inputLeftElement,
  inputRightElement,
  onInputChange,
  disabled,
  ...rest
}: TokenRowProps<C>) {
  const {
    number: { localeParts },
  } = useLocaleFormatter()

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
              isNumericString={true}
              value={value}
              disabled={disabled}
              onValueChange={e => {
                onChange(e.value)
                if (onInputChange && e.value !== value) onInputChange(e.value)
              }}
            />
          )
        }}
        name={fieldName}
        control={control}
        rules={rules}
      />
      {inputRightElement && (
        <InputRightElement width='4.5rem'>{inputRightElement}</InputRightElement>
      )}
    </InputGroup>
  )
}
