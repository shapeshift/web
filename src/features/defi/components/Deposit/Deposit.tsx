import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { useCallback } from 'react'
import type { ControllerProps, UseFormSetValue } from 'react-hook-form'
import { useController, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { FormField } from 'components/DeFi/components/FormField'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

type DepositProps = {
  accountId?: AccountId | undefined
  asset: Asset
  rewardAsset?: Asset
  // Estimated apy (Deposit Only)
  apy: string
  // Users available amount
  cryptoAmountAvailableBaseUnit: string
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
  onMaxClick?: (setValue: UseFormSetValue<DepositValues>) => Promise<void>
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
  CryptoAmountBaseUnit = 'cryptoAmountBaseUnit',
  Slippage = 'slippage',
}

export type DepositValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmountBaseUnit]: string
  [Field.Slippage]: string
}

const DEFAULT_SLIPPAGE = '0.5'

function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).toFixed()
}

export const Deposit = ({
  accountId,
  apy,
  asset,
  marketData,
  cryptoAmountAvailableBaseUnit,
  fiatAmountAvailable,
  cryptoInputValidation,
  fiatInputValidation,
  isLoading,
  onAccountIdChange: handleAccountIdChange,
  onContinue,
  onMaxClick,
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
      [Field.CryptoAmountBaseUnit]: '',
      [Field.Slippage]: DEFAULT_SLIPPAGE,
    },
  })

  const handleMaxClick = useCallback(() => onMaxClick!(setValue), [onMaxClick, setValue])

  const values = useWatch({ control })
  const { field: cryptoAmountBaseUnit } = useController({
    name: 'cryptoAmountBaseUnit',
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

  console.log({ fieldError })

  const handleInputChange = (value: string, isFiat?: boolean) => {
    if (isFiat) {
      setValue(Field.FiatAmount, value, { shouldValidate: true })
      setValue(
        Field.CryptoAmountBaseUnit,
        bnOrZero(value).times(bn(10).pow(asset.precision)).div(marketData.price).toString(),
        {
          shouldValidate: true,
        },
      )
    } else {
      setValue(
        Field.FiatAmount,
        bnOrZero(value).div(bn(10).pow(asset.precision)).times(marketData.price).toString(),
        {
          shouldValidate: true,
        },
      )
      setValue(
        Field.CryptoAmountBaseUnit,
        bnOrZero(value).times(bn(10).pow(asset.precision)).toString(),
        {
          shouldValidate: true,
        },
      )
    }
  }

  const handlePercentClick = useCallback(
    (percent: number) => {
      // The human crypto amount as a result of amount * percentage / 100, possibly with too many digits
      const percentageAmountBaseUnit = bnOrZero(cryptoAmountAvailableBaseUnit).times(percent)
      const percentageAmountCryptoPrecision = percentageAmountBaseUnit.div(
        bn(10).pow(asset.precision),
      )
      const percentageFiatAmount = percentageAmountCryptoPrecision.times(marketData.price)
      setValue(Field.FiatAmount, percentageFiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmountBaseUnit, percentageAmountBaseUnit.toString(), {
        shouldValidate: true,
      })
    },
    [asset.precision, cryptoAmountAvailableBaseUnit, marketData.price, setValue],
  )

  const onSubmit = (values: DepositValues) => {
    onContinue(values)
  }

  const cryptoYieldBaseUnit = calculateYearlyYield(apy, values.cryptoAmountBaseUnit)
  const fiatYield = bnOrZero(fromBaseUnit(cryptoYieldBaseUnit, asset.precision))
    .times(marketData.price)
    .toFixed(2)

  return (
    <>
      <Stack spacing={6} as='form' width='full' onSubmit={handleSubmit(onSubmit)}>
        <FormField label={translate('modals.deposit.amountToDeposit')}>
          <AssetInput
            accountId={accountId}
            cryptoAmountBaseUnit={cryptoAmountBaseUnit?.value}
            assetId={asset.assetId}
            onAccountIdChange={handleAccountIdChange}
            onChange={(value, isFiat) => handleInputChange(value, isFiat)}
            {...(onMaxClick ? { onMaxClick: handleMaxClick } : {})}
            fiatAmount={fiatAmount?.value}
            showFiatAmount={true}
            assetIcon={asset.icon}
            assetSymbol={asset.symbol}
            cryptoBalanceBaseUnit={cryptoAmountAvailableBaseUnit}
            fiatBalance={fiatAmountAvailable}
            onPercentOptionClick={handlePercentClick}
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
