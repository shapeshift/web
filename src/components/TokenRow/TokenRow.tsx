import { Box, Flex, InputGroupProps, InputProps, useStyleConfig } from '@chakra-ui/react'
import { Control, Controller, ControllerProps, FieldValues, Path } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { FlexibleInputContainer } from 'components/FlexibleInputContainer/FlexibleInputContainer'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'

const CryptoInput = (props: InputProps) => (
  <FlexibleInputContainer
    size='lg'
    type='number'
    textAlign='right'
    placeholder='Enter amount'
    variant='unstyled'
    pr={2}
    borderRadius='0'
    flexGrow={1}
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
    number: { localeParts }
  } = useLocaleFormatter({ fiatType: 'USD' })

  /** Duplicating chakra <Input variant='filled' /> border and background styles */
  const styles = useStyleConfig('Input', { variant: 'filled', size: 'lg' })
  const { bg, border, borderColor, borderRadius, _focus } = (styles as any).field
  const filledCss = { bg, border, borderColor, borderRadius, _focusWithin: _focus }

  return (
    <Flex size='lg' align='center' {...rest} sx={filledCss}>
      {inputLeftElement && <Box m='2px'>{inputLeftElement}</Box>}
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
                onInputChange && e.value !== value && onInputChange(e.value)
                onChange(e.value)
              }}
            />
          )
        }}
        name={fieldName}
        control={control}
        rules={rules}
      />
      {inputRightElement && <Box mr='8px'>{inputRightElement}</Box>}
    </Flex>
  )
}
