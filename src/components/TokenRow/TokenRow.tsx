import type { InputGroupProps, InputProps } from '@chakra-ui/react'
import { Input, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import type {
  Control,
  ControllerProps,
  ControllerRenderProps,
  FieldValues,
  Path,
} from 'react-hook-form'
import { Controller } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { allowedDecimalSeparators } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const CryptoInput = (props: InputProps) => {
  const translate = useTranslate()
  return (
    <Input
      pr='4.5rem'
      pl='7.5rem'
      size='lg'
      type='number'
      variant='filled'
      placeholder={translate('common.enterAmount')}
      {...props}
    />
  )
}

type TokenRowProps<C extends FieldValues> = {
  assetId: AssetId
  isFiat: boolean
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
  assetId,
  isFiat,
  ...rest
}: TokenRowProps<C>) {
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const renderController = useCallback(
    ({ field: { onChange, value } }: { field: ControllerRenderProps<C, Path<C>> }) => {
      return (
        <NumberFormat
          decimalScale={isFiat ? undefined : asset?.precision}
          inputMode='decimal'
          thousandSeparator={localeParts.group}
          decimalSeparator={localeParts.decimal}
          allowedDecimalSeparators={allowedDecimalSeparators}
          customInput={CryptoInput}
          isNumericString={true}
          value={value}
          disabled={disabled}
          // this is already within a useCallback, we don't need to memo this
          // eslint-disable-next-line react-memo/require-usememo
          onValueChange={e => {
            onChange(e.value)
            if (onInputChange && e.value !== value) onInputChange(e.value)
          }}
        />
      )
    },
    [asset?.precision, disabled, isFiat, localeParts.decimal, localeParts.group, onInputChange],
  )

  return (
    <InputGroup size='lg' {...rest}>
      {inputLeftElement && (
        <InputLeftElement ml={1} width='auto'>
          {inputLeftElement}
        </InputLeftElement>
      )}
      <Controller render={renderController} name={fieldName} control={control} rules={rules} />
      {inputRightElement && (
        <InputRightElement width='4.5rem'>{inputRightElement}</InputRightElement>
      )}
    </InputGroup>
  )
}
