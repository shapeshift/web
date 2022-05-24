import { Button, Input, InputGroup, InputGroupProps, InputLeftElement } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { Field, StakingValues } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { CSSProperties } from 'react'
import { Control, Controller } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'

type StakingInputProps = {
  isCryptoField: boolean
  onInputToggle: () => void
  onInputChange: (value: string) => void
  amountRef: string | null
  asset: Asset
  control: Control<StakingValues>
  inputStyle?: CSSProperties
}

const cryptoInputValidation = {
  required: true,
  validate: {
    validateCryptoAmount: (cryptoAmount: string) => bnOrZero(cryptoAmount).gt(0),
  },
}
const fiatInputValidation = {
  required: true,
  validate: {
    validateFiatAmount: (fiatAmount: string) => bnOrZero(fiatAmount).gt(0),
  },
}
const CryptoInput = (props: any) => (
  <Input
    pr='4.5rem'
    pl='0.5rem'
    ml='0.5rem'
    size='lg'
    type='number'
    border={0}
    placeholder='Enter amount'
    {...props}
  />
)

export const StakingInput = ({
  asset,
  amountRef,
  control,
  isCryptoField,
  onInputToggle,
  onInputChange,
  inputStyle,
  ...styleProps
}: StakingInputProps & InputGroupProps) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  return (
    <InputGroup size='lg' {...styleProps}>
      <InputLeftElement ml={2} pos='relative' width='auto'>
        <Button
          onClick={onInputToggle}
          size='sm'
          variant='ghost'
          textTransform='uppercase'
          width='full'
        >
          {isCryptoField ? asset.symbol : 'USD'}
        </Button>
      </InputLeftElement>
      {isCryptoField && (
        <Controller
          render={({ field: { onChange, value } }) => {
            return (
              <NumberFormat
                customInput={CryptoInput}
                style={inputStyle}
                isNumericString={true}
                decimalSeparator={localeParts.decimal}
                inputMode='decimal'
                thousandSeparator={localeParts.group}
                value={value}
                onChange={() => {
                  onChange(amountRef)
                  onInputChange(amountRef as string)
                  amountRef = null
                }}
                onValueChange={e => {
                  amountRef = e.value
                }}
              />
            )
          }}
          name={Field.CryptoAmount}
          control={control}
          rules={cryptoInputValidation}
        />
      )}
      {!isCryptoField && (
        <Controller
          render={({ field: { onChange, value } }) => {
            return (
              <NumberFormat
                customInput={CryptoInput}
                style={inputStyle}
                isNumericString={true}
                decimalSeparator={localeParts.decimal}
                inputMode='decimal'
                thousandSeparator={localeParts.group}
                value={value.length ? bnOrZero(value).toPrecision() : undefined}
                onChange={() => {
                  onChange(amountRef)
                  onInputChange(amountRef as string)
                  amountRef = null
                }}
                onValueChange={e => {
                  amountRef = e.value
                }}
              />
            )
          }}
          name={Field.FiatAmount}
          control={control}
          rules={fiatInputValidation}
        />
      )}
    </InputGroup>
  )
}
