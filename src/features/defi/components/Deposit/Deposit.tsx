import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import type { AccountId } from '@keepkey/caip'
import type { MarketData } from '@keepkey/types'
import get from 'lodash/get'
import { useCallback } from 'react'
import type { ControllerProps } from 'react-hook-form'
import { useController, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { FormField } from 'components/DeFi/components/FormField'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { Nullable } from 'types/common'

type DepositProps = {
  accountId?: Nullable<AccountId>
  asset: Asset
  rewardAsset?: Asset
  // Estimated apy (Deposit Only)
  apy: string
  // Users available amount
  cryptoAmountAvailable: string
  // Validation rules for the crypto input
  cryptoInputValidation?: ControllerProps['rules']
  // Users available amount
  fiatAmountAvailable: string
  // Validation rules for the fiat input
  fiatInputValidation?: ControllerProps['rules']
  // enables slippage UI (defaults to true)
  enableSlippage?: boolean
  // Asset market data
  marketData: MarketData
  onAccountIdChange?: AccountDropdownProps['onChange']
  // Array of the % options
  percentOptions: number[]
  isLoading: boolean
  onContinue(values: DepositValues): void
  onBack?(): void
  onCancel(): void
  inputIcons?: string[]
}

export enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount',
  Slippage = 'slippage',
}

export type DepositValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
  [Field.Slippage]: string
}

const DEFAULT_SLIPPAGE = '0.5'

function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).toString()
}

export const Deposit = ({
  accountId,
  apy,
  asset,
  marketData,
  cryptoAmountAvailable,
  fiatAmountAvailable,
  cryptoInputValidation,
  fiatInputValidation,
  isLoading,
  onAccountIdChange: handleAccountIdChange,
  onContinue,
  percentOptions,
  inputIcons,
  rewardAsset,
}: DepositProps) => {
  const translate = useTranslate()
  const green = useColorModeValue('green.500', 'green.200')

  const {
    control,
    setValue,
    formState: { errors, isValid },
    handleSubmit,
  } = useForm<DepositValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FiatAmount]: '',
      [Field.CryptoAmount]: '',
      [Field.Slippage]: DEFAULT_SLIPPAGE,
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
  const cryptoError = get(errors, 'cryptoAmount.message', null)
  const fiatError = get(errors, 'fiatAmount.message', null)
  const fieldError = cryptoError || fiatError

  const handleInputChange = (value: string, isFiat?: boolean) => {
    if (isFiat) {
      setValue(Field.FiatAmount, value, { shouldValidate: true })
      setValue(Field.CryptoAmount, bnOrZero(value).div(marketData.price).toString(), {
        shouldValidate: true,
      })
    } else {
      setValue(Field.FiatAmount, bnOrZero(value).times(marketData.price).toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, value, {
        shouldValidate: true,
      })
    }
  }

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount =
        percent === 1
          ? cryptoAmountAvailable
          : bnOrZero(cryptoAmountAvailable).times(percent).precision(asset.precision)
      const fiatAmount = bnOrZero(cryptoAmount).times(marketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), {
        shouldValidate: true,
      })
    },
    [asset.precision, cryptoAmountAvailable, marketData.price, setValue],
  )

  const onSubmit = (values: DepositValues) => {
    onContinue(values)
  }

  const cryptoYield = calculateYearlyYield(apy, values.cryptoAmount)
  const fiatYield = bnOrZero(cryptoYield).times(marketData.price).toFixed(2)

  return (
    <>
      <Stack spacing={6} as='form' width='full' onSubmit={handleSubmit(onSubmit)}>
        <FormField label={translate('modals.deposit.amountToDeposit')}>
          <AssetInput
            accountId={accountId}
            cryptoAmount={cryptoAmount?.value}
            assetId={asset.assetId}
            onAccountIdChange={handleAccountIdChange}
            onChange={(value, isFiat) => handleInputChange(value, isFiat)}
            fiatAmount={fiatAmount?.value}
            showFiatAmount={true}
            assetIcon={asset.icon}
            assetSymbol={asset.symbol}
            balance={cryptoAmountAvailable}
            fiatBalance={fiatAmountAvailable}
            onMaxClick={value => handlePercentClick(value)}
            percentOptions={percentOptions}
            icons={inputIcons}
          />
          <Row>
            <Stack flex={1} spacing={0}>
              <Text fontWeight='medium' translation='modals.deposit.estimatedReturns' />
              <Amount.Percent color={green} value={apy} prefix='@' suffix='APY' />
            </Stack>
            <Row.Value>
              <Stack textAlign='right' spacing={0}>
                <Amount.Fiat value={fiatYield} fontWeight='bold' lineHeight='1' mb={1} />
                <Stack alignItems='flex-end'>
                  <AssetIcon size='xs' src={(rewardAsset ?? asset).icon} />
                </Stack>
              </Stack>
            </Row.Value>
          </Row>
        </FormField>
        <Button
          size='lg'
          width='full'
          colorScheme={fieldError ? 'red' : 'blue'}
          isDisabled={!isValid}
          isLoading={isLoading}
          type='submit'
          data-test='defi-modal-continue-button'
        >
          {translate(fieldError || 'common.continue')}
        </Button>
      </Stack>
    </>
  )
}
