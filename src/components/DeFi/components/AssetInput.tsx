import { ChevronDownIcon } from '@chakra-ui/icons'
import type { FormControlProps, InputProps } from '@chakra-ui/react'
import { Button, FormControl, FormErrorMessage, Input, Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import type { FieldError } from 'react-hook-form'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import {
  AccountDropdown,
  type AccountDropdownProps,
} from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { allowedDecimalSeparators } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { colors } from 'theme/colors'

import { Balance } from './Balance'
import { PercentOptionsButtonGroup } from './PercentOptionsButtonGroup'

const inputStyle = { caretColor: colors.blue[200] }
const accountDropdownButtonProps = { variant: 'ghost', width: 'full', paddingX: 2, paddingY: 0 }

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
      style={inputStyle}
      autoComplete='off'
      {...props}
    />
  )
}

export type AssetInputProps = {
  accountId?: AccountId | undefined
  assetId: AssetId
  assetSymbol: string
  assetIcon: string | undefined
  onChange?: (value: string, isFiat?: boolean) => void
  onAssetClick?: () => void
  onMaxClick?: () => Promise<void>
  onPercentOptionClick?: (args: number) => void
  isReadOnly?: boolean
  isSendMaxDisabled?: boolean
  cryptoAmount?: string
  fiatAmount?: string
  showFiatAmount?: boolean
  balance?: string
  fiatBalance?: string
  errors?: FieldError
  percentOptions: number[]
  icons?: string[]
  onAccountIdChange?: AccountDropdownProps['onChange']
  showInputSkeleton?: boolean
  showFiatSkeleton?: boolean
  formControlProps?: FormControlProps
  accountSelectionDisabled?: boolean
  revalidateOnValueChange?: boolean
} & PropsWithChildren

export const AssetInput: React.FC<AssetInputProps> = ({
  accountId,
  assetId,
  assetSymbol,
  onChange = () => {},
  onAssetClick,
  onMaxClick,
  onPercentOptionClick,
  cryptoAmount,
  isReadOnly,
  isSendMaxDisabled,
  fiatAmount,
  showFiatAmount = '0',
  balance,
  fiatBalance,
  errors,
  percentOptions = [0.25, 0.5, 0.75, 1],
  icons,
  children,
  onAccountIdChange: handleAccountIdChange,
  showInputSkeleton,
  showFiatSkeleton,
  formControlProps,
  accountSelectionDisabled,
  revalidateOnValueChange = true,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const translate = useTranslate()
  const amountRef = useRef<string | null>(null)
  const [isFiat, toggleIsFiat] = useToggle(false)
  const [isFocused, setIsFocused] = useState(false)
  const handleBlur = useCallback(() => setIsFocused(false), [])
  const handleFocus = useCallback(() => setIsFocused(true), [])

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  // Lower the decimal places when the integer is greater than 8 significant digits for better UI
  const cryptoAmountIntegerCount = useMemo(
    () => bnOrZero(bnOrZero(cryptoAmount).toFixed(0)).precision(true),
    [cryptoAmount],
  )
  const formattedCryptoAmount = useMemo(
    () =>
      bnOrZero(cryptoAmountIntegerCount).isLessThanOrEqualTo(8)
        ? cryptoAmount
        : bnOrZero(cryptoAmount).toFixed(3),
    [cryptoAmount, cryptoAmountIntegerCount],
  )

  const formControlHover = useMemo(
    () => ({ bg: isReadOnly ? 'background.input.base' : 'background.input.hover' }),
    [isReadOnly],
  )

  const handleChange = useCallback(() => {
    // onChange will send us the formatted value
    // To get around this we need to get the value from the onChange using a ref
    // Now when the max buttons are clicked the onChange will not fire
    onChange(amountRef.current ?? '', isFiat)
  }, [isFiat, onChange])

  const handleValueChange = useCallback(
    (values: NumberFormatValues) => {
      // This fires anytime value changes including setting it on max click
      // Store the value in a ref to send when we actually want the onChange to fire
      amountRef.current = values.value

      if (revalidateOnValueChange) {
        handleChange()
      }
    },
    [handleChange, revalidateOnValueChange],
  )

  return (
    <FormControl
      borderWidth={2}
      borderColor={isFocused ? 'border.focused' : 'border.input.base'}
      bg={isFocused ? 'background.input.pressed' : 'background.input.base'}
      borderRadius='xl'
      _hover={formControlHover}
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
          <Skeleton isLoaded={!showInputSkeleton} width='full'>
            <NumberFormat
              decimalScale={isFiat ? undefined : asset?.precision}
              customInput={CryptoInput}
              isNumericString={true}
              disabled={isReadOnly}
              suffix={isFiat ? localeParts.postfix : ''}
              prefix={isFiat ? localeParts.prefix : ''}
              decimalSeparator={localeParts.decimal}
              inputMode='decimal'
              allowedDecimalSeparators={allowedDecimalSeparators}
              thousandSeparator={localeParts.group}
              value={isFiat ? bnOrZero(fiatAmount).toFixed(2) : formattedCryptoAmount}
              onValueChange={handleValueChange}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
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
      {(onPercentOptionClick || balance) && (
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
          {onPercentOptionClick && (
            <PercentOptionsButtonGroup
              options={percentOptions}
              isDisabled={isReadOnly || isSendMaxDisabled}
              onMaxClick={onMaxClick}
              onClick={onPercentOptionClick}
            />
          )}
        </Stack>
      )}
      {handleAccountIdChange && (
        <AccountDropdown
          {...(accountId ? { defaultAccountId: accountId } : {})}
          assetId={assetId}
          onChange={handleAccountIdChange}
          buttonProps={accountDropdownButtonProps}
          disabled={accountSelectionDisabled}
          autoSelectHighestBalance
        />
      )}
      {errors && <FormErrorMessage px={4}>{errors?.message}</FormErrorMessage>}
      {children && (
        <Stack mt={2} borderTopWidth={1} borderColor='border.base'>
          {children}
        </Stack>
      )}
    </FormControl>
  )
}
