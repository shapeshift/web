import {
  Button,
  IconButton,
  InputRightElement,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Stack,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import type { PropsWithChildren, ReactNode } from 'react'
import React from 'react'
import type { ControllerProps, FieldValues } from 'react-hook-form'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { FormField } from 'components/DeFi/components/FormField'
import { SliderIcon } from 'components/Icons/Slider'
import { Slippage } from 'components/Slippage/Slippage'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'

type InputDefaultValue = {
  cryptoAmount: string
  fiatAmount: string
}

type WithdrawProps = {
  accountId?: AccountId | undefined
  asset: Asset
  // Users available amount
  cryptoAmountAvailable: string
  // Validation rules for the crypto input
  cryptoInputValidation?: ControllerProps['rules']
  // enables slippage UI (defaults to true)
  enableSlippage?: boolean
  // Users available amount
  fiatAmountAvailable: string
  // Validation rules for the fiat input
  fiatInputValidation?: ControllerProps['rules']
  // Asset market data
  marketData: MarketData
  onAccountIdChange?: AccountDropdownProps['onChange']
  // Array of the % options
  percentOptions: number[]
  // Show withdraw types
  enableWithdrawType?: boolean
  disableInput?: boolean
  feePercentage?: string
  isLoading?: boolean
  handlePercentClick: (arg: number) => void
  onContinue(values: FieldValues): void
  onCancel(): void
  onInputChange?: (value: string, isFiat?: boolean) => void
  onChange?: (fiatAmount: string, cryptoAmount: string) => void
  icons?: string[]
  inputDefaultValue?: InputDefaultValue
  inputChildren?: ReactNode
} & PropsWithChildren

export enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount',
  Slippage = 'slippage',
  WithdrawType = 'withdrawType',
}

export type WithdrawValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
  [Field.Slippage]: string
}

const DEFAULT_SLIPPAGE = '0.5'

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  asset,
  marketData,
  cryptoAmountAvailable,
  fiatAmountAvailable,
  cryptoInputValidation,
  disableInput,
  enableSlippage = false,
  fiatInputValidation,
  handlePercentClick,
  onAccountIdChange: handleAccountIdChange,
  onContinue,
  isLoading,
  percentOptions,
  children,
  onInputChange,
  onChange,
  icons,
  inputDefaultValue,
  inputChildren,
}) => {
  const translate = useTranslate()
  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    setValue,
  } = useFormContext()

  const values = useWatch({ control })

  const { field: cryptoAmount } = useController({
    name: 'cryptoAmount',
    control,
    rules: cryptoInputValidation,
    defaultValue: inputDefaultValue?.cryptoAmount ?? '',
  })
  const { field: fiatAmount } = useController({
    name: 'fiatAmount',
    control,
    rules: fiatInputValidation,
    defaultValue: inputDefaultValue?.fiatAmount ?? '',
  })

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const cryptoError = errors?.cryptoAmount?.message ?? null
  const fiatError = errors?.fiatAmount?.message ?? null
  const fieldError = cryptoError || fiatError

  const handleInputChange = (value: string, isFiat?: boolean) => {
    if (isFiat) {
      const cryptoAmount = bnOrZero(value).div(marketData.price).toString()
      setValue(Field.FiatAmount, value, { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount, {
        shouldValidate: true,
      })
      onChange && onChange(value, cryptoAmount)
    } else {
      const fiatAmount = bnOrZero(value).times(marketData.price).toString()
      setValue(Field.FiatAmount, fiatAmount, {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, value, {
        shouldValidate: true,
      })
      onChange && onChange(fiatAmount, value)
    }
    if (onInputChange) onInputChange(value, isFiat)
  }

  const handleSlippageChange = (value: string | number) => {
    setValue(Field.Slippage, String(value))
  }

  const onSubmit = (values: FieldValues) => {
    if (!isConnected) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }
    onContinue(values)
  }

  if (!asset) return null

  return (
    <Stack spacing={6} as='form' maxWidth='lg' width='full' onSubmit={handleSubmit(onSubmit)}>
      <FormField label={translate('modals.withdraw.amountToWithdraw')}>
        <AssetInput
          accountId={accountId}
          cryptoAmount={cryptoAmount?.value}
          onAccountIdChange={handleAccountIdChange}
          onChange={(value, isFiat) => handleInputChange(value, isFiat)}
          fiatAmount={fiatAmount?.value}
          showFiatAmount={true}
          assetId={asset.assetId}
          assetIcon={asset.icon}
          assetSymbol={asset.symbol}
          balance={cryptoAmountAvailable}
          fiatBalance={fiatAmountAvailable}
          onPercentOptionClick={value => handlePercentClick(value)}
          percentOptions={percentOptions}
          isReadOnly={disableInput}
          icons={icons}
        >
          {!!inputChildren && inputChildren}
        </AssetInput>
      </FormField>
      {children}
      {enableSlippage && (
        <InputRightElement>
          <Popover>
            <PopoverTrigger>
              <IconButton
                size='sm'
                aria-label='Slippage Settings'
                variant='ghost'
                icon={<SliderIcon />}
              />
            </PopoverTrigger>
            <PopoverContent width='sm'>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader>
                <Text fontSize='sm' translation='modals.withdraw.slippageSettings' />
              </PopoverHeader>
              <PopoverBody>
                <Slippage
                  onChange={handleSlippageChange}
                  value={values?.slippage || DEFAULT_SLIPPAGE}
                />
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </InputRightElement>
      )}

      <Button
        colorScheme={fieldError ? 'red' : 'blue'}
        isDisabled={!isValid}
        size='lg'
        width='full'
        isLoading={isLoading}
        type='submit'
      >
        {translate(fieldError || 'common.continue')}
      </Button>
    </Stack>
  )
}
