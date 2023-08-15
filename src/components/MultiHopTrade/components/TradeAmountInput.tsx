import type { FormControlProps, InputProps } from '@chakra-ui/react'
import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Skeleton,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { FocusEvent, PropsWithChildren } from 'react'
import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { FieldError } from 'react-hook-form'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { Balance } from 'components/DeFi/components/Balance'
import { PercentOptionsButtonGroup } from 'components/DeFi/components/PercentOptionsButtonGroup'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { colors } from 'theme/colors'

const cryptoInputStyle = { caretColor: colors.blue[200] }
const buttonProps = { variant: 'unstyled', display: 'flex', height: 'auto' }
const boxProps = { px: 0, m: 0 }

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
      textAlign='left'
      variant='inline'
      placeholder={translate('common.enterAmount')}
      style={cryptoInputStyle}
      autoComplete='off'
      {...props}
    />
  )
}

export type TradeAmountInputProps = {
  assetId?: AssetId
  accountId?: AccountId
  assetSymbol: string
  assetIcon: string
  onChange?: (value: string, isFiat?: boolean) => void
  onMaxClick?: () => Promise<void>
  onPercentOptionClick?: (args: number) => void
  onAccountIdChange: AccountDropdownProps['onChange']
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
  showInputSkeleton?: boolean
  showFiatSkeleton?: boolean
  formControlProps?: FormControlProps
  label?: string
  rightRegion?: JSX.Element
  labelPostFix?: JSX.Element
} & PropsWithChildren

const defaultPercentOptions = [0.25, 0.5, 0.75, 1]

export const TradeAmountInput: React.FC<TradeAmountInputProps> = memo(
  ({
    assetId,
    accountId,
    assetSymbol,
    onChange,
    onMaxClick,
    onPercentOptionClick,
    onAccountIdChange,
    cryptoAmount,
    isReadOnly,
    isSendMaxDisabled,
    fiatAmount,
    showFiatAmount = '0',
    balance,
    fiatBalance,
    errors,
    percentOptions = defaultPercentOptions,
    children,
    showInputSkeleton,
    showFiatSkeleton,
    formControlProps,
    label,
    rightRegion,
    labelPostFix,
  }) => {
    const {
      number: { localeParts },
    } = useLocaleFormatter()
    const amountRef = useRef<string | null>(null)
    const [isFiat, toggleIsFiat] = useToggle(false)
    const [isFocused, setIsFocused] = useState(false)
    const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
    const bgColor = useColorModeValue('white', 'gray.850')
    const focusBg = useColorModeValue('gray.50', 'gray.900')
    const focusBorder = useColorModeValue('blue.500', 'blue.400')

    // Lower the decimal places when the integer is greater than 8 significant digits for better UI
    const cryptoAmountIntegerCount = bnOrZero(bnOrZero(cryptoAmount).toFixed(0)).precision(true)
    const formattedCryptoAmount = useMemo(
      () =>
        bnOrZero(cryptoAmountIntegerCount).isLessThanOrEqualTo(8)
          ? cryptoAmount
          : bnOrZero(cryptoAmount).toFixed(3),
      [cryptoAmount, cryptoAmountIntegerCount],
    )

    const handleOnChange = useCallback(() => {
      // onChange will send us the formatted value
      // To get around this we need to get the value from the onChange using a ref
      // Now when the max buttons are clicked the onChange will not fire
      onChange?.(amountRef.current ?? '', isFiat)
    }, [isFiat, onChange])

    const handleOnBlur = useCallback(() => setIsFocused(false), [])
    const handleOnFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      e.target.select()
    }, [])

    const handleValueChange = useCallback((values: NumberFormatValues) => {
      // This fires anytime value changes including setting it on max click
      // Store the value in a ref to send when we actually want the onChange to fire
      amountRef.current = values.value
    }, [])

    const oppositeCurrency = useMemo(() => {
      return isFiat ? (
        <Amount.Crypto value={cryptoAmount ?? ''} symbol={assetSymbol} />
      ) : (
        <Amount.Fiat value={fiatAmount ?? ''} prefix='≈' />
      )
    }, [assetSymbol, cryptoAmount, fiatAmount, isFiat])

    return (
      <FormControl
        borderWidth={1}
        borderColor={isFocused ? focusBorder : borderColor}
        bg={isFocused ? focusBg : bgColor}
        borderRadius='xl'
        isInvalid={!!errors}
        pt={3}
        pb={2}
        {...formControlProps}
      >
        <Flex justifyContent='space-between' alignItems='center' px={6} width='full' mb={2}>
          {label && (
            <Flex alignItems='center'>
              <FormLabel mb={0} fontSize='sm'>
                {label}
              </FormLabel>
            </Flex>
          )}
          {balance && assetId && (
            <AccountDropdown
              defaultAccountId={accountId}
              assetId={assetId}
              onChange={onAccountIdChange}
              disabled={false}
              autoSelectHighestBalance
              buttonProps={buttonProps}
              boxProps={boxProps}
              showLabel={false}
              label={
                <Balance
                  cryptoBalance={balance}
                  fiatBalance={fiatBalance ?? ''}
                  symbol={assetSymbol}
                  isFiat={isFiat}
                  label={'Balance:'}
                  textAlign='right'
                />
              }
            />
          )}
        </Flex>
        {labelPostFix}
        <Stack direction='row' alignItems='center' px={6}>
          <Flex gap={2} flex={1} alignItems='center'>
            <Skeleton isLoaded={!showInputSkeleton} width='full'>
              <NumberFormat
                customInput={CryptoInput}
                isNumericString={true}
                disabled={isReadOnly}
                _disabled={{ opacity: 1, cursor: 'not-allowed' }}
                suffix={isFiat ? localeParts.postfix : ''}
                prefix={isFiat ? localeParts.prefix : ''}
                decimalSeparator={localeParts.decimal}
                inputMode='decimal'
                thousandSeparator={localeParts.group}
                value={isFiat ? bnOrZero(fiatAmount).toFixed(2) : formattedCryptoAmount}
                onValueChange={handleValueChange}
                onChange={handleOnChange}
                onBlur={handleOnBlur}
                onFocus={handleOnFocus}
              />
            </Skeleton>
            {rightRegion}
          </Flex>
        </Stack>
        <Flex
          direction='row'
          gap={2}
          pt={4}
          pb={2}
          px={6}
          justifyContent='space-between'
          alignItems='center'
        >
          {showFiatAmount && (
            <Button
              onClick={toggleIsFiat}
              size='sm'
              disabled={showFiatSkeleton}
              fontWeight='medium'
              variant='link'
              color='text.subtle'
            >
              <Skeleton isLoaded={!showFiatSkeleton}>{oppositeCurrency}</Skeleton>
            </Button>
          )}
          {onPercentOptionClick && (
            <PercentOptionsButtonGroup
              options={percentOptions}
              isDisabled={isReadOnly || isSendMaxDisabled}
              onMaxClick={onMaxClick}
              onClick={onPercentOptionClick}
            />
          )}
        </Flex>
        {errors && <FormErrorMessage px={4}>{errors?.message}</FormErrorMessage>}
        {children}
      </FormControl>
    )
  },
)
