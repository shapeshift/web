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
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { PropsWithChildren, useRef, useState } from 'react'
import { FieldError } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
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
  assetSymbol: string
  assetIcon: string
  onChange?: (arg0: string, arg1?: boolean) => void
  onAssetClick?: () => void
  onMaxClick?: (args: number) => void
  isReadOnly?: boolean
  cryptoAmount?: string
  fiatAmount?: string
  showFiatAmount?: boolean
  balance?: string
  fiatBalance?: string
  errors?: FieldError
  percentOptions: number[]
  icons?: string[]
} & PropsWithChildren

export const AssetInput: React.FC<AssetInputProps> = ({
  assetSymbol,
  assetIcon,
  onChange = () => {},
  onAssetClick,
  onMaxClick,
  cryptoAmount,
  isReadOnly,
  fiatAmount,
  showFiatAmount = '0',
  balance,
  fiatBalance,
  errors,
  percentOptions = [0.25, 0.5, 0.75, 1],
  icons,
  children,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const translate = useTranslate()
  const amountRef = useRef<string | null>(null)
  const [isFiat, setIsFiat] = useState<boolean>(false)
  const [isFocused, setIsFocused] = useState(false)
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'gray.850')
  const focusBg = useColorModeValue('gray.50', 'gray.900')
  const focusBorder = useColorModeValue('blue.500', 'blue.400')
  return (
    <FormControl
      borderWidth={1}
      borderColor={isFocused ? focusBorder : borderColor}
      bg={isFocused ? focusBg : bgColor}
      borderRadius='xl'
      _hover={{ bg: isReadOnly ? bgColor : focusBg }}
      isInvalid={!!errors}
      py={2}
    >
      <Stack direction='row' alignItems='center' px={4}>
        <Button
          onClick={onAssetClick}
          size='sm'
          variant={onAssetClick ? 'solid' : 'read-only'}
          leftIcon={
            icons ? (
              <PairIcons icons={icons} iconBoxSize='5' h='38px' p={1} borderRadius={8} />
            ) : (
              <AssetIcon src={assetIcon} size='xs' />
            )
          }
          rightIcon={onAssetClick && <ChevronDownIcon />}
        >
          {assetSymbol}
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
            value={isFiat ? bnOrZero(fiatAmount).toFixed(2) : cryptoAmount}
            onValueChange={values => {
              // This fires anytime value changes including setting it on max click
              // Store the value in a ref to send when we actually want the onChange to fire
              amountRef.current = values.value
            }}
            onChange={() => {
              // onChange will send us the formatted value
              // To get around this we need to get the value from the onChange using a ref
              // Now when the max buttons are clicked the onChange will not fire
              onChange(amountRef.current ?? '', isFiat)
            }}
            onBlur={() => setIsFocused(false)}
            onFocus={() => setIsFocused(true)}
          />
        </Stack>
      </Stack>

      {showFiatAmount && (
        <Stack width='full' alignItems='flex-end' px={4} pb={2}>
          <Button onClick={() => setIsFiat(!isFiat)} size='xs' variant='link' colorScheme='blue'>
            {isFiat ? (
              <Amount.Crypto value={cryptoAmount ?? ''} symbol={assetSymbol} />
            ) : (
              <Amount.Fiat value={fiatAmount ?? ''} prefix='≈' />
            )}
          </Button>
        </Stack>
      )}
      {(onMaxClick || balance) && (
        <Stack direction='row' py={2} px={4} justifyContent='space-between' alignItems='center'>
          {balance && (
            <Balance
              cryptoBalance={balance}
              fiatBalance={fiatBalance ?? ''}
              symbol={assetSymbol}
              isFiat={isFiat}
              label={translate('common.balance')}
            />
          )}
          {onMaxClick && (
            <MaxButtonGroup options={percentOptions} isDisabled={isReadOnly} onClick={onMaxClick} />
          )}
        </Stack>
      )}
      {errors && <FormErrorMessage px={4}>{errors?.message}</FormErrorMessage>}
      {children && (
        <Stack mt={2} borderTopWidth={1} borderColor={borderColor}>
          {children}
        </Stack>
      )}
    </FormControl>
  )
}
