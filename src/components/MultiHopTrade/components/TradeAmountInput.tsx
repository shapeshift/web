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
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import noop from 'lodash/noop'
import type { ElementType, FocusEvent, JSX, PropsWithChildren } from 'react'
import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { ControllerRenderProps, FieldError, RegisterOptions } from 'react-hook-form'
import { Controller, useForm, useFormContext } from 'react-hook-form'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { usePriceImpact } from '../hooks/quoteValidation/usePriceImpact'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { Balance } from '@/components/DeFi/components/Balance'
import { PercentOptionsButtonGroup } from '@/components/DeFi/components/PercentOptionsButtonGroup'
import { Display } from '@/components/Display'
import { WalletIcon } from '@/components/Icons/WalletIcon'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectIsAssetWithoutMarketData,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { colors } from '@/theme/colors'

export type TradeAmountInputFormValues = {
  amountFieldInput: string
  amountCryptoPrecision: string
  amountUserCurrency: string
}

type RenderController = ({
  field,
}: {
  field: ControllerRenderProps<TradeAmountInputFormValues, 'amountFieldInput'>
}) => React.ReactElement

const cryptoInputStyle = { caretColor: colors.blue[200] }
const buttonProps = {
  variant: 'unstyled',
  display: 'flex',
  height: 'auto',
  lineHeight: '1',
  width: '100%',
}
const boxProps = { px: 0, m: 0, maxWidth: '220px' }
const numberFormatDisabled = { opacity: 1, cursor: 'not-allowed' }
const inputContainerStyle = {
  display: {
    base: 'flex',
    md: 'block',
  },
  flexDirection: {
    base: 'row-reverse',
    md: 'column',
  },
  alignItems: 'center',
  justifyContent: {
    base: 'space-between',
    md: 'flex-start',
  },
}

export const AmountInput = (props: InputProps) => {
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
      placeholder={props.placeholder ?? translate('common.enterAmount')}
      style={cryptoInputStyle}
      autoComplete='off'
      errorBorderColor='red.500'
      {...props}
    />
  )
}

export type TradeAmountInputProps = {
  amountFieldInputRules?: Omit<
    RegisterOptions,
    'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'
  >
  autoSelectHighestBalance?: boolean
  assetId: AssetId
  accountId?: AccountId
  assetSymbol: string
  assetIcon: string | undefined
  onChange?: (value: string, isFiat?: boolean) => void
  onMaxClick: (isFiat: boolean) => Promise<void>
  onPercentOptionClick?: (args: number) => void
  onAccountIdChange: AccountDropdownProps['onChange']
  isReadOnly?: boolean
  isSendMaxDisabled?: boolean
  cryptoAmount: string
  fiatAmount: string
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
  rightComponent?: ElementType<{ assetId: AssetId }>
  labelPostFix?: JSX.Element
  hideAmounts?: boolean
  layout?: 'inline' | 'stacked'
  isAccountSelectionDisabled?: boolean
  isAccountSelectionHidden?: boolean
  isFiat?: boolean
  onToggleIsFiat?: (isInputtingFiatSellAmount: boolean) => void
  placeholder?: string
  activeQuote?: TradeQuote | TradeRate | undefined
} & PropsWithChildren

const defaultPercentOptions = [0.25, 0.5, 0.75, 1]
const defaultFormValues = {
  amountFieldInput: '',
  amountCryptoPrecision: '',
  amountUserCurrency: '',
}

// TODO: While this is called "TradeAmountInput", its parent TradeAssetInput is consumed by everything under the sun but swapper
// Scrutinize this and rename all Trade references here, or at the very least in the parent to something more generic for sanity
export const TradeAmountInput: React.FC<TradeAmountInputProps> = memo(
  ({
    amountFieldInputRules,
    assetId,
    accountId,
    assetSymbol,
    autoSelectHighestBalance = true,
    onChange,
    onMaxClick,
    onPercentOptionClick,
    onAccountIdChange,
    isAccountSelectionDisabled,
    isAccountSelectionHidden = false,
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
    placeholder,
    formControlProps,
    label,
    rightComponent: RightComponent,
    labelPostFix,
    hideAmounts,
    layout = 'stacked',
    isFiat,
    activeQuote,
    onToggleIsFiat: handleIsInputtingFiatSellAmountChange,
  }) => {
    const {
      number: { localeParts },
    } = useLocaleFormatter()
    const translate = useTranslate()
    const amountRef = useRef<string | null>(null)
    const [isFocused, setIsFocused] = useState(false)
    const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
    const bgColor = useColorModeValue('white', 'gray.850')
    const focusBg = useColorModeValue('gray.50', 'gray.900')
    const focusBorder = useColorModeValue('blue.500', 'blue.400')
    const accountDropdownBalanceColor = useColorModeValue('black', 'white')

    const asset = useAppSelector(state => selectAssetById(state, assetId))
    const assetMarketDataUserCurrency = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, assetId),
    )
    const isAssetWithoutMarketData = useAppSelector(state =>
      selectIsAssetWithoutMarketData(state, assetId),
    )

    // Local controller in case consumers don't have a form context, which is the case for all current consumers currently except RFOX
    const _methods = useForm<TradeAmountInputFormValues>({
      defaultValues: defaultFormValues,
      mode: 'onChange',
      shouldUnregister: true,
    })
    const methods = useFormContext<TradeAmountInputFormValues>()
    const control = methods?.control ?? _methods.control
    const setValue = methods?.setValue ?? _methods.setValue

    // Lower the decimal places when the integer is greater than 8 significant digits for better UI
    const cryptoAmountIntegerCount = bnOrZero(bnOrZero(cryptoAmount).toFixed(0)).precision(true)
    const formattedCryptoAmount = useMemo(
      () =>
        bnOrZero(cryptoAmountIntegerCount).isLessThanOrEqualTo(8)
          ? cryptoAmount
          : bnOrZero(cryptoAmount).toFixed(3),
      [cryptoAmount, cryptoAmountIntegerCount],
    )

    const { priceImpactColor, priceImpactPercentage } = usePriceImpact(activeQuote)

    // Only display price impact if we have one, for buy side only
    const shouldDisplayPriceImpact = useMemo(
      () =>
        priceImpactPercentage && activeQuote && assetId !== activeQuote?.steps[0].sellAsset.assetId,
      [activeQuote, assetId, priceImpactPercentage],
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

    const toggleIsFiat = useCallback(() => {
      handleIsInputtingFiatSellAmountChange?.(!isFiat)
    }, [handleIsInputtingFiatSellAmountChange, isFiat])

    const oppositeCurrency = useMemo(() => {
      return isFiat ? (
        <Amount.Crypto value={cryptoAmount} symbol={assetSymbol} prefix='≈' />
      ) : (
        <Amount.Fiat value={fiatAmount} prefix='≈' />
      )
    }, [assetSymbol, cryptoAmount, fiatAmount, isFiat])

    const renderController: RenderController = useCallback(
      ({ field: { onChange } }) => {
        return (
          <NumberFormat
            customInput={AmountInput}
            decimalScale={isFiat ? undefined : asset?.precision}
            isNumericString={true}
            disabled={isReadOnly}
            _disabled={numberFormatDisabled}
            suffix={isFiat ? localeParts.postfix : ''}
            prefix={isFiat ? localeParts.prefix : ''}
            decimalSeparator={localeParts.decimal}
            inputMode='decimal'
            allowedDecimalSeparators={allowedDecimalSeparators}
            thousandSeparator={localeParts.group}
            placeholder={placeholder}
            value={isFiat ? bnOrZero(fiatAmount).toFixed(2) : formattedCryptoAmount}
            // this is already within a useCallback, we don't need to memo this
            // eslint-disable-next-line react-memo/require-usememo
            onValueChange={(values: NumberFormatValues) => {
              // Controller onChange
              onChange(values.value)
              handleValueChange(values)

              const value = values.value
              if (isFiat) {
                setValue('amountUserCurrency', value)
                const _cryptoAmount = bnOrZero(value)
                  .div(bnOrZero(assetMarketDataUserCurrency?.price))
                  .toFixed()
                setValue('amountCryptoPrecision', _cryptoAmount)
              } else {
                setValue('amountCryptoPrecision', value)
                setValue(
                  'amountUserCurrency',
                  bnOrZero(value)
                    .times(bnOrZero(assetMarketDataUserCurrency?.price))
                    .toFixed(),
                )
              }
            }}
            onChange={handleOnChange}
            onBlur={handleOnBlur}
            onFocus={handleOnFocus}
          />
        )
      },
      [
        asset,
        assetMarketDataUserCurrency?.price,
        fiatAmount,
        formattedCryptoAmount,
        handleOnBlur,
        handleOnChange,
        handleOnFocus,
        handleValueChange,
        isFiat,
        placeholder,
        isReadOnly,
        localeParts.decimal,
        localeParts.group,
        localeParts.postfix,
        localeParts.prefix,
        setValue,
      ],
    )

    const accountDropdownLabel = useMemo(
      () => (
        <>
          <Display.Desktop>
            <Balance
              cryptoBalance={balance ?? ''}
              fiatBalance={fiatBalance ?? ''}
              symbol={assetSymbol}
              isFiat={isFiat}
              label={`${translate('common.balance')}:`}
              textAlign='right'
            />
          </Display.Desktop>
          <Display.Mobile>
            <Flex alignItems='center'>
              <WalletIcon me={2} />
              <Balance
                cryptoBalance={balance ?? ''}
                fiatBalance={fiatBalance ?? ''}
                symbol={assetSymbol}
                isFiat={isFiat}
                textAlign='right'
                color={accountDropdownBalanceColor}
              />
            </Flex>
          </Display.Mobile>
        </>
      ),
      [assetSymbol, balance, fiatBalance, isFiat, translate, accountDropdownBalanceColor],
    )

    const handleOnMaxClick = useMemo(() => () => onMaxClick(Boolean(isFiat)), [isFiat, onMaxClick])

    return (
      <FormControl
        borderWidth={1}
        borderColor={isFocused ? focusBorder : borderColor}
        bg={isFocused ? focusBg : bgColor}
        borderRadius='xl'
        isInvalid={!!errors}
        pt={3}
        pb={2}
        className='trade-amount-input'
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
          <Display.Desktop>
            {balance && label && !isAccountSelectionHidden && (
              <AccountDropdown
                defaultAccountId={accountId}
                assetId={assetId}
                onChange={onAccountIdChange}
                disabled={isAccountSelectionDisabled}
                autoSelectHighestBalance={autoSelectHighestBalance}
                buttonProps={buttonProps}
                boxProps={boxProps}
                showLabel={false}
                label={accountDropdownLabel}
              />
            )}
          </Display.Desktop>
        </Flex>
        <Flex sx={inputContainerStyle}>
          {labelPostFix}
          <Stack direction='row' alignItems='center' px={6} display={hideAmounts ? 'none' : 'flex'}>
            <Flex gap={2} flex={1} alignItems='flex-end' pb={layout === 'inline' ? 4 : 0}>
              <Skeleton isLoaded={!showInputSkeleton} width='full'>
                <Controller
                  name={'amountFieldInput'}
                  render={renderController}
                  control={control}
                  rules={amountFieldInputRules}
                />
              </Skeleton>
              {RightComponent && <RightComponent assetId={assetId} />}
              {layout === 'inline' &&
                showFiatAmount &&
                !isAssetWithoutMarketData &&
                !hideAmounts && (
                  <Button
                    onClick={toggleIsFiat}
                    size='sm'
                    disabled={showFiatSkeleton}
                    fontWeight='medium'
                    variant='link'
                    color='text.subtle'
                    mb={1}
                  >
                    <Skeleton isLoaded={!showFiatSkeleton}>{oppositeCurrency}</Skeleton>
                  </Button>
                )}
            </Flex>
          </Stack>
        </Flex>
        {layout === 'stacked' && (
          <Flex
            direction='row'
            gap={2}
            pt={4}
            pb={2}
            px={6}
            justifyContent='space-between'
            alignItems='center'
            display={hideAmounts ? 'none' : 'flex'}
          >
            {showFiatAmount && !isAssetWithoutMarketData && (
              <Flex alignItems='center' gap={2}>
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
                {shouldDisplayPriceImpact && (
                  <Tooltip label={translate('trade.tooltip.inputOutputDifference')}>
                    <Flex>
                      <Skeleton isLoaded={!showFiatSkeleton}>
                        <Amount.Percent
                          fontSize='sm'
                          prefix='('
                          suffix=')'
                          color={priceImpactColor ?? 'text.subtle'}
                          value={priceImpactPercentage?.div(100).times(-1).toString()}
                        />
                      </Skeleton>
                    </Flex>
                  </Tooltip>
                )}
              </Flex>
            )}
            <Flex alignItems='center' justifyContent='flex-end' gap={2}>
              <Display.Mobile>
                {balance && label && !isAccountSelectionHidden && (
                  <AccountDropdown
                    defaultAccountId={accountId}
                    assetId={assetId}
                    onChange={onAccountIdChange}
                    disabled={isAccountSelectionDisabled}
                    autoSelectHighestBalance={autoSelectHighestBalance}
                    buttonProps={buttonProps}
                    boxProps={boxProps}
                    showLabel={false}
                    label={accountDropdownLabel}
                  />
                )}

                {balance && !label && !isAccountSelectionHidden && (
                  <AccountDropdown
                    defaultAccountId={accountId}
                    assetId={assetId}
                    onChange={onAccountIdChange}
                    disabled={isAccountSelectionDisabled}
                    autoSelectHighestBalance={autoSelectHighestBalance}
                    buttonProps={buttonProps}
                    boxProps={boxProps}
                    showLabel={false}
                    label={accountDropdownLabel}
                  />
                )}
              </Display.Mobile>
              <PercentOptionsButtonGroup
                options={percentOptions}
                isDisabled={isReadOnly || isSendMaxDisabled}
                onMaxClick={handleOnMaxClick}
                onClick={onPercentOptionClick ?? noop}
              />
              <Display.Desktop>
                {balance && !label && !isAccountSelectionHidden && (
                  <AccountDropdown
                    defaultAccountId={accountId}
                    assetId={assetId}
                    onChange={onAccountIdChange}
                    disabled={isAccountSelectionDisabled}
                    autoSelectHighestBalance={autoSelectHighestBalance}
                    buttonProps={buttonProps}
                    boxProps={boxProps}
                    showLabel={false}
                    label={accountDropdownLabel}
                  />
                )}
              </Display.Desktop>
            </Flex>
          </Flex>
        )}

        {errors && <FormErrorMessage px={4}>{errors?.message}</FormErrorMessage>}
        {children}
      </FormControl>
    )
  },
)
