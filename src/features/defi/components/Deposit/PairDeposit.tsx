import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip/dist/accountId/accountId'
import type { MarketData } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { calculateYearlyYield } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
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
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

import { PairIcons } from '../PairIcons/PairIcons'

type DepositProps = {
  accountId?: AccountId | undefined
  asset0: Asset
  asset1: Asset
  destAsset: Asset
  // Estimated apy (Deposit Only)
  apy: string
  // Users available amount
  cryptoAmountAvailable0: string
  cryptoAmountAvailable1: string
  // Validation rules for the crypto input
  cryptoInputValidation0?: ControllerProps['rules']
  cryptoInputValidation1?: ControllerProps['rules']
  // Users available amount
  fiatAmountAvailable0: string
  fiatAmountAvailable1: string
  // Validation rules for the fiat input
  fiatInputValidation0?: ControllerProps['rules']
  fiatInputValidation1?: ControllerProps['rules']
  // enables slippage UI (defaults to true)
  enableSlippage?: boolean
  // Asset1 market data
  marketData0: MarketData
  // Asset2 market data
  marketData1: MarketData
  // Array of the % options
  percentOptions: number[]
  isLoading: boolean
  onAccountIdChange?: AccountDropdownProps['onChange']
  onContinue(values: DepositValues): void
  onBack?(): void
  onCancel(): void
  underlyingAssetRatiosBaseUnit: LpEarnOpportunityType['underlyingAssetRatiosBaseUnit']
  icons?: string[]
}

enum Field {
  FiatAmount0 = 'fiatAmount0',
  FiatAmount1 = 'fiatAmount1',
  CryptoAmount0 = 'cryptoAmount0',
  CryptoAmount1 = 'cryptoAmount1',
}

export type DepositValues = {
  [Field.FiatAmount0]: string
  [Field.CryptoAmount0]: string
  [Field.FiatAmount1]: string
  [Field.CryptoAmount1]: string
}

export const PairDeposit = ({
  apy,
  accountId,
  asset0,
  asset1,
  underlyingAssetRatiosBaseUnit,
  destAsset,
  marketData0,
  marketData1,
  cryptoAmountAvailable0,
  cryptoAmountAvailable1,
  fiatAmountAvailable0,
  fiatAmountAvailable1,
  cryptoInputValidation0,
  cryptoInputValidation1,
  fiatInputValidation0,
  fiatInputValidation1,
  isLoading,
  onAccountIdChange: handleAccountIdChange,
  onContinue,
  percentOptions,
  icons,
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
      [Field.FiatAmount0]: '',
      [Field.FiatAmount1]: '',
      [Field.CryptoAmount0]: '',
      [Field.CryptoAmount1]: '',
    },
  })

  const values = useWatch({ control })
  const { field: cryptoAmount0 } = useController({
    name: 'cryptoAmount0',
    control,
    rules: cryptoInputValidation0,
  })
  const { field: cryptoAmount1 } = useController({
    name: 'cryptoAmount1',
    control,
    rules: cryptoInputValidation1,
  })
  const { field: fiatAmount0 } = useController({
    name: 'fiatAmount0',
    control,
    rules: fiatInputValidation0,
  })
  const { field: fiatAmount1 } = useController({
    name: 'fiatAmount1',
    control,
    rules: fiatInputValidation1,
  })

  const calculateOtherAssetAmount = useCallback(
    (inputAmount: string, inputIsForAsset0: boolean) => {
      const inputAssetRatio = bnOrZero(underlyingAssetRatiosBaseUnit[inputIsForAsset0 ? 0 : 1])
      const otherAssetRatio = bnOrZero(underlyingAssetRatiosBaseUnit[inputIsForAsset0 ? 1 : 0])
      const inputAmountCryptoBaseUnit = bnOrZero(inputAmount).times(
        bnOrZero(10).pow(bnOrZero(inputIsForAsset0 ? asset0.precision : asset1.precision)),
      )
      const otherAmountInBaseUnit = inputAmountCryptoBaseUnit
        .times(otherAssetRatio)
        .div(inputAssetRatio)
      const otherAmount = otherAmountInBaseUnit
        .div(bnOrZero(10).pow(bnOrZero(inputIsForAsset0 ? asset1.precision : asset0.precision)))
        .toString()

      return otherAmount
    },
    [asset0.precision, asset1.precision, underlyingAssetRatiosBaseUnit],
  )

  const cryptoError0 = get(errors, 'cryptoAmount0.message', null)
  const cryptoError1 = get(errors, 'cryptoAmount1.message', null)
  const fiatError0 = get(errors, 'fiatAmount0.message', null)
  const fiatError1 = get(errors, 'fiatAmount1.message', null)
  const fieldError = cryptoError0 || cryptoError1 || fiatError0 || fiatError1

  const handleInputChange = useCallback(
    (value: string, isForAsset0: boolean, isFiat?: boolean) => {
      const assetMarketData = isForAsset0 ? marketData0 : marketData1
      const fiatField = isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
      const cryptoField = isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1

      const otherFiatInput = !isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
      const otherCryptoInput = !isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1
      const otherAssetMarketData = !isForAsset0 ? marketData0 : marketData1

      if (isFiat) {
        setValue(fiatField, value, { shouldValidate: true })
        const cryptoValue = bnOrZero(value).div(assetMarketData.price).toString()
        setValue(cryptoField, cryptoValue, {
          shouldValidate: true,
        })

        const otherCryptoValue = calculateOtherAssetAmount(cryptoValue, isForAsset0)
        setValue(otherCryptoInput, otherCryptoValue, { shouldValidate: true })

        const otherFiatValue = bnOrZero(otherCryptoValue)
          .times(otherAssetMarketData.price)
          .toString()
        setValue(otherFiatInput, otherFiatValue, { shouldValidate: true })
      } else {
        setValue(cryptoField, value, { shouldValidate: true })
        const fiatValue = bnOrZero(value).times(assetMarketData.price).toString()
        setValue(fiatField, fiatValue, {
          shouldValidate: true,
        })

        const otherCryptoValue = calculateOtherAssetAmount(value, isForAsset0)
        setValue(otherCryptoInput, otherCryptoValue, { shouldValidate: true })

        const otherFiatValue = bnOrZero(otherCryptoValue)
          .times(otherAssetMarketData.price)
          .toString()
        setValue(otherFiatInput, otherFiatValue, { shouldValidate: true })
      }
    },
    [calculateOtherAssetAmount, marketData0, marketData1, setValue],
  )

  const handlePercentClick = (percent: number, isForAsset0: boolean) => {
    const assetMarketData = isForAsset0 ? marketData0 : marketData1
    const fiatField = isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
    const cryptoField = isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1

    const otherFiatInput = !isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
    const otherCryptoInput = !isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1
    const otherAssetMarketData = !isForAsset0 ? marketData0 : marketData1

    const cryptoAmount = bnOrZero(
      isForAsset0 ? cryptoAmountAvailable0 : cryptoAmountAvailable1,
    ).times(percent)
    const fiatAmount = bnOrZero(cryptoAmount).times(assetMarketData.price)
    setValue(fiatField, fiatAmount.toString(), {
      shouldValidate: true,
    })
    setValue(cryptoField, cryptoAmount.toString(), {
      shouldValidate: true,
    })

    const otherCryptoValue = calculateOtherAssetAmount(cryptoAmount.toString(), isForAsset0)
    setValue(otherCryptoInput, otherCryptoValue, { shouldValidate: true })

    const otherFiatValue = bnOrZero(otherCryptoValue).times(otherAssetMarketData.price).toString()
    setValue(otherFiatInput, otherFiatValue, { shouldValidate: true })
  }

  const onSubmit = (values: DepositValues) => {
    onContinue(values)
  }

  const cryptoYield = calculateYearlyYield(apy, values.cryptoAmount1)
  const fiatYield = bnOrZero(cryptoYield).times(marketData1.price).toFixed(2)

  return (
    <>
      <Stack spacing={6} as='form' width='full' onSubmit={handleSubmit(onSubmit)}>
        <FormField label={translate('modals.deposit.amountToDeposit')}>
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={cryptoAmount0?.value}
            onChange={(value, isFiat) => handleInputChange(value, true, isFiat)}
            fiatAmount={fiatAmount0?.value}
            showFiatAmount={true}
            assetId={asset0.assetId}
            assetIcon={asset0.icon}
            assetSymbol={asset0.symbol}
            balance={cryptoAmountAvailable0}
            fiatBalance={fiatAmountAvailable0}
            onAccountIdChange={handleAccountIdChange}
            onPercentOptionClick={value => handlePercentClick(value, true)}
            percentOptions={percentOptions}
            errors={cryptoError0 || fiatError0}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={cryptoAmount1?.value}
            onChange={(value, isFiat) => handleInputChange(value, false, isFiat)}
            fiatAmount={fiatAmount1?.value}
            showFiatAmount={true}
            assetId={asset1.assetId}
            assetIcon={asset1.icon}
            assetSymbol={asset1.symbol}
            balance={cryptoAmountAvailable1}
            fiatBalance={fiatAmountAvailable1}
            onAccountIdChange={handleAccountIdChange}
            onPercentOptionClick={value => handlePercentClick(value, false)}
            percentOptions={percentOptions}
            errors={cryptoError1 || fiatError1}
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
                  {icons ? (
                    <PairIcons icons={icons} iconBoxSize='5' h='38px' p={1} borderRadius={8} />
                  ) : (
                    <AssetIcon size='xs' src={destAsset.icon} />
                  )}
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
          data-test='defi-modal-continue-button'
          type='submit'
        >
          {translate(fieldError || 'common.continue')}
        </Button>
      </Stack>
    </>
  )
}
