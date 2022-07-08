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
import { Asset, MarketData, WithdrawType } from '@shapeshiftoss/types'
import React, { useState } from 'react'
import {
  ControllerProps,
  ControllerRenderProps,
  useController,
  useForm,
  useWatch,
} from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { FormField } from 'components/DeFi/components/FormField'
import { SliderIcon } from 'components/Icons/Slider'
import { Slippage } from 'components/Slippage/Slippage'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'

export type FlexFieldProps = {
  control: any
  cryptoAmount: ControllerRenderProps<WithdrawValues, 'cryptoAmount'>
  fiatAmount: ControllerRenderProps<WithdrawValues, 'fiatAmount'>
  handlePercentClick: (args: number) => void
  setDisableInput: (args: boolean) => void
}

type WithdrawProps = {
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
  // Array of the % options
  percentOptions: number[]
  // Show withdraw types
  enableWithdrawType?: boolean
  feePercentage?: string
  isLoading?: boolean
  flexFields?: (args: FlexFieldProps) => JSX.Element
  onContinue(values: WithdrawValues): void
  updateWithdraw?(values: Pick<WithdrawValues, Field.WithdrawType | Field.CryptoAmount>): void
  onCancel(): void
}

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
  [Field.WithdrawType]: WithdrawType
}

const DEFAULT_SLIPPAGE = '0.5'

export const Withdraw: React.FC<WithdrawProps> = ({
  asset,
  marketData,
  cryptoAmountAvailable,
  cryptoInputValidation,
  enableSlippage = true,
  fiatInputValidation,
  onContinue,
  isLoading,
  percentOptions,
  flexFields,
  children,
}) => {
  const translate = useTranslate()
  const [disableInput, setDisableInput] = useState(false)

  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    setValue,
  } = useForm<WithdrawValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FiatAmount]: '',
      [Field.CryptoAmount]: '',
      [Field.Slippage]: DEFAULT_SLIPPAGE,
      [Field.WithdrawType]: WithdrawType.DELAYED,
    },
  })

  const values = useWatch({ control })

  const { field: cryptoAmount } = useController({
    name: 'cryptoAmount',
    control,
    rules: cryptoInputValidation,
  })
  const { field: fiatAmount } = useController({
    name: 'fiatAmount',
    control,
    rules: fiatInputValidation,
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
      fiatAmount.onChange(value)
      cryptoAmount.onChange(bnOrZero(value).div(marketData.price).toFixed(4).toString())
    } else {
      cryptoAmount.onChange(value)
      fiatAmount.onChange(bnOrZero(value).times(marketData.price).toFixed(4).toString())
    }
  }

  const handlePercentClick = (_percent: number) => {
    const amount = bnOrZero(cryptoAmountAvailable).times(_percent)
    fiatAmount.onChange(amount.times(marketData.price).toFixed(4).toString())
    cryptoAmount.onChange(amount.toString())
  }

  const handleSlippageChange = (value: string | number) => {
    setValue(Field.Slippage, String(value))
  }

  const onSubmit = (values: WithdrawValues) => {
    if (!isConnected) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }
    onContinue(values)
  }

  return (
    <Stack spacing={6} as='form' maxWidth='lg' width='full' onSubmit={handleSubmit(onSubmit)}>
      <FormField label={translate('modals.withdraw.amountToWithdraw')}>
        <AssetInput
          cryptoAmount={cryptoAmount?.value}
          onChange={(value, isFiat) => handleInputChange(value, isFiat)}
          fiatAmount={fiatAmount?.value}
          assetIcon={asset.icon}
          assetName={asset.symbol}
          balance={cryptoAmountAvailable}
          onMaxClick={value => handlePercentClick(value)}
          percentOptions={percentOptions}
          isReadOnly={disableInput}
        />
      </FormField>
      {flexFields &&
        flexFields({ control, handlePercentClick, cryptoAmount, fiatAmount, setDisableInput })}
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
      {children}
      <Button
        colorScheme={fieldError ? 'red' : 'blue'}
        isDisabled={!isValid}
        size='lg'
        isFullWidth
        isLoading={isLoading}
        type='submit'
      >
        {translate(fieldError || 'common.continue')}
      </Button>
    </Stack>
  )
}
