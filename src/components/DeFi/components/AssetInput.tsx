import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  InputProps,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FieldError } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { colors } from 'theme/colors'

import { Balance } from './Balance'
import { MaxButtonGroup } from './MaxButtonGroup'

const CryptoInput = (props: InputProps) => (
  <Input
    size='lg'
    fontSize='xl'
    borderRadius={0}
    py={1}
    height='auto'
    type='number'
    textAlign='right'
    variant='inline'
    placeholder='Enter amount'
    style={{ caretColor: colors.blue[200] }}
    {...props}
  />
)

export type AssetInputProps = {
  assetName: string
  assetIcon: string
  onChange?: (arg0: string, arg1?: boolean) => void
  onClick?: () => void
  onMaxClick?: (args: number) => void
  isReadOnly?: boolean
  cryptoAmount?: string
  fiatAmount?: string
  balance?: string
  errors?: FieldError
}

export const AssetInput: React.FC<AssetInputProps> = ({
  assetName,
  assetIcon,
  onChange = () => {},
  onClick,
  onMaxClick,
  cryptoAmount,
  isReadOnly,
  fiatAmount,
  balance,
  errors,
  children,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const [isFiat, setIsFiat] = useState<boolean>(false)
  const [isFocused, setIsFocused] = useState(false)
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'gray.850')
  const focusBg = useColorModeValue('gray.100', 'gray.900')
  const focusBorder = useColorModeValue('blue.500', 'blue.400')
  return (
    <FormControl
      pb={2}
      borderWidth={1}
      borderColor={isFocused ? focusBorder : borderColor}
      bg={isFocused ? focusBg : bgColor}
      borderRadius='xl'
      _hover={{ bg: isReadOnly ? bgColor : focusBg }}
      isInvalid={!!errors}
    >
      <Stack direction='row' alignItems='center' px={4} py={2}>
        <Button
          onClick={onClick}
          variant={onClick ? 'solid' : 'read-only'}
          leftIcon={<AssetIcon src={assetIcon} size='xs' />}
          rightIcon={onClick && <ChevronDownIcon />}
        >
          {assetName}
        </Button>
        <Stack spacing={0} flex={1} alignItems='flex-end'>
          <NumberFormat
            customInput={CryptoInput}
            isNumericString={true}
            disabled={isReadOnly}
            suffix={isFiat ? localeParts.postfix : ''}
            prefix={isFiat ? localeParts.prefix : ''}
            decimalSeparator={localeParts.decimal}
            inputMode='decimal'
            thousandSeparator={localeParts.group}
            value={isFiat ? fiatAmount : cryptoAmount}
            onValueChange={values => {
              onChange(values.value, isFiat)
            }}
            onBlur={() => setIsFocused(false)}
            onFocus={() => setIsFocused(true)}
          />
          {fiatAmount && (
            <Button onClick={() => setIsFiat(!isFiat)} size='xs' variant='link' colorScheme='blue'>
              {isFiat ? (
                <Amount.Crypto value={cryptoAmount || ''} symbol={assetName} />
              ) : (
                <Amount.Fiat value={fiatAmount || ''} prefix='≈' />
              )}
            </Button>
          )}
        </Stack>
      </Stack>
      {(onMaxClick || balance) && (
        <Stack direction='row' py={2} px={4} justifyContent='space-between' alignItems='center'>
          {balance && <Balance value={balance} symbol='FOX' label='Balance' />}
          {onMaxClick && <MaxButtonGroup options={[0.25, 0.5, 0.75, 1]} onClick={onMaxClick} />}
        </Stack>
      )}
      {errors && <FormErrorMessage px={4}>{errors?.message}</FormErrorMessage>}
      {children && (
        <Stack px={4} py={2} mt={2} borderTopWidth={1} borderColor={borderColor}>
          {children}
        </Stack>
      )}
    </FormControl>
  )
}
