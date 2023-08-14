import { ChevronDownIcon } from '@chakra-ui/icons'
import type { FormControlProps, InputProps } from '@chakra-ui/react'
import {
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  Skeleton,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import type { PropsWithChildren } from 'react'
import React, { useRef, useState } from 'react'
import type { FieldError } from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import {
  type AccountDropdownProps,
  AccountDropdown,
} from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { colors } from 'theme/colors'

const CryptoInput = (props: InputProps) => {
  const translate = useTranslate()
  return (
    <Input
      size='lg'
      fontSize='xl'
      borderRadius={0}
      py={0}
      height='auto'
      type='number'
      textAlign='right'
      variant='inline'
      placeholder={translate('common.enterAmount')}
      style={{ caretColor: colors.blue[200] }}
      autoComplete='off'
      {...props}
    />
  )
}

export type AllocationProps = {
  accountId?: AccountId | undefined
  accountSelectionDisabled?: boolean
  allocationFraction?: string // Decimal representation of fractional pool allocation. Eg. 1 out of 100 shares => allocationFraction = (1/100) = 0.01
  assetId?: AssetId
  assetSymbol: string
  cryptoAmount?: string
  errors?: FieldError
  fiatAmount?: string
  formControlProps?: FormControlProps
  icons?: string[]
  isReadOnly?: boolean
  onAccountIdChange?: AccountDropdownProps['onChange']
  onAssetClick?: () => void
  onChange?: (value: string, isFiat?: boolean) => void
  showFiatAmount?: boolean
  showFiatSkeleton?: boolean
  showInputSkeleton?: boolean
} & PropsWithChildren

export const Allocation: React.FC<AllocationProps> = ({
  accountId,
  accountSelectionDisabled,
  allocationFraction,
  assetId,
  assetSymbol,
  children,
  cryptoAmount,
  errors,
  fiatAmount,
  formControlProps,
  icons,
  isReadOnly,
  onAccountIdChange: handleAccountIdChange,
  onAssetClick,
  onChange = () => {},
  showFiatAmount = '0',
  showFiatSkeleton,
  showInputSkeleton,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const translate = useTranslate()
  const amountRef = useRef<string | null>(null)
  const [isFiat, toggleIsFiat] = useToggle(false)
  const [isFocused, setIsFocused] = useState(false)
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'gray.850')
  const focusBg = useColorModeValue('gray.50', 'gray.900')
  const focusBorder = useColorModeValue('blue.500', 'blue.400')

  // Lower the decimal places when the integer is greater than 8 significant digits for better UI
  const cryptoAmountIntegerCount = bnOrZero(bnOrZero(cryptoAmount).toFixed(0)).precision(true)
  const formattedCryptoAmount = bnOrZero(cryptoAmountIntegerCount).isLessThanOrEqualTo(8)
    ? cryptoAmount
    : bnOrZero(cryptoAmount).toFixed(3)
  const formattedAllocationFraction = bnOrZero(allocationFraction).multipliedBy(bn(100)).toFixed(5)

  return (
    <Stack spacing={2}>
      <Row>
        <RawText fontWeight='medium'>{translate('modals.deposit.allocation.heading')}</RawText>
        <Stack direction='row' fontSize='sm' color='text.subtle' justifyContent='space-between'>
          {allocationFraction && (
            <RawText>{`${formattedAllocationFraction}${translate(
              'modals.deposit.allocation.fractionDescription',
            )}`}</RawText>
          )}
        </Stack>
      </Row>
      <FormControl
        borderWidth={1}
        borderColor={isFocused ? focusBorder : borderColor}
        bg={isFocused ? focusBg : bgColor}
        borderRadius='xl'
        _hover={{ bg: isReadOnly ? bgColor : focusBg }}
        isInvalid={!!errors}
        pt={3}
        pb={2}
        {...formControlProps}
      >
        <Stack direction='row' alignItems='center' px={4}>
          <Button
            data-test='asset-input-selection-button'
            onClick={onAssetClick}
            size='sm'
            variant={onAssetClick ? 'solid' : 'read-only'}
            leftIcon={
              icons ? (
                <PairIcons icons={icons} iconBoxSize='5' h='38px' p={1} borderRadius={8} />
              ) : (
                <AssetIcon assetId={assetId} size='xs' />
              )
            }
            rightIcon={onAssetClick && <ChevronDownIcon />}
          >
            {assetSymbol}
          </Button>
          <Stack spacing={0} flex={1} alignItems='flex-end'>
            <Skeleton isLoaded={!showInputSkeleton}>
              <NumberFormat
                customInput={CryptoInput}
                isNumericString={true}
                disabled={isReadOnly}
                suffix={isFiat ? localeParts.postfix : ''}
                prefix={isFiat ? localeParts.prefix : ''}
                decimalSeparator={localeParts.decimal}
                inputMode='decimal'
                thousandSeparator={localeParts.group}
                value={isFiat ? bnOrZero(fiatAmount).toFixed(2) : formattedCryptoAmount}
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
            </Skeleton>
          </Stack>
        </Stack>

        {showFiatAmount && (
          <Stack width='full' alignItems='flex-end' px={4} pb={2} mt={1}>
            <Button
              onClick={toggleIsFiat}
              size='xs'
              disabled={showFiatSkeleton}
              fontWeight='medium'
              variant='link'
              color='text.subtle'
            >
              <Skeleton isLoaded={!showFiatSkeleton}>
                {isFiat ? (
                  <Amount.Crypto value={cryptoAmount ?? ''} symbol={assetSymbol} />
                ) : (
                  <Amount.Fiat value={fiatAmount ?? ''} prefix='≈' />
                )}
              </Skeleton>
            </Button>
          </Stack>
        )}
        {handleAccountIdChange && assetId && (
          <AccountDropdown
            {...(accountId ? { defaultAccountId: accountId } : {})}
            assetId={assetId}
            onChange={handleAccountIdChange}
            buttonProps={{ variant: 'ghost', width: 'full', paddingX: 2, paddingY: 0 }}
            disabled={accountSelectionDisabled}
            autoSelectHighestBalance
          />
        )}
        {errors && <FormErrorMessage px={4}>{errors?.message}</FormErrorMessage>}
        {children && (
          <Stack mt={2} borderTopWidth={1} borderColor={borderColor}>
            {children}
          </Stack>
        )}
      </FormControl>
    </Stack>
  )
}
