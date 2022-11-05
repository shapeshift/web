import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import type { AccountId } from '@keepkey/caip/dist/accountId/accountId'
import type { MarketData } from '@keepkey/types'
import get from 'lodash/get'
import { calculateYearlyYield } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
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

import { PairIcons } from '../PairIcons/PairIcons'

type DepositProps = {
  accountId?: Nullable<AccountId>
  asset1: Asset
  asset2: Asset
  destAsset: Asset
  // Estimated apy (Deposit Only)
  apy: string
  // Users available amount
  cryptoAmountAvailable1: string
  cryptoAmountAvailable2: string
  // Validation rules for the crypto input
  cryptoInputValidation1?: ControllerProps['rules']
  cryptoInputValidation2?: ControllerProps['rules']
  // Users available amount
  fiatAmountAvailable1: string
  fiatAmountAvailable2: string
  // Validation rules for the fiat input
  fiatInputValidation1?: ControllerProps['rules']
  fiatInputValidation2?: ControllerProps['rules']
  // enables slippage UI (defaults to true)
  enableSlippage?: boolean
  // Asset1 market data
  marketData1: MarketData
  // Asset2 market data
  marketData2: MarketData
  // Array of the % options
  percentOptions: number[]
  isLoading: boolean
  onAccountIdChange?: AccountDropdownProps['onChange']
  onContinue(values: DepositValues): void
  onBack?(): void
  onCancel(): void
  syncPair?: boolean
  icons?: string[]
}

enum Field {
  FiatAmount1 = 'fiatAmount1',
  FiatAmount2 = 'fiatAmount2',
  CryptoAmount1 = 'cryptoAmount1',
  CryptoAmount2 = 'cryptoAmount2',
}

export type DepositValues = {
  [Field.FiatAmount1]: string
  [Field.CryptoAmount1]: string
  [Field.FiatAmount2]: string
  [Field.CryptoAmount2]: string
}

export const PairDeposit = ({
  apy,
  accountId,
  asset1,
  asset2,
  destAsset,
  marketData1,
  marketData2,
  cryptoAmountAvailable1,
  cryptoAmountAvailable2,
  fiatAmountAvailable1,
  fiatAmountAvailable2,
  cryptoInputValidation1,
  cryptoInputValidation2,
  fiatInputValidation1,
  fiatInputValidation2,
  isLoading,
  onAccountIdChange: handleAccountIdChange,
  onContinue,
  percentOptions,
  syncPair = true,
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
      [Field.FiatAmount1]: '',
      [Field.FiatAmount2]: '',
      [Field.CryptoAmount1]: '',
      [Field.CryptoAmount2]: '',
    },
  })

  const values = useWatch({ control })
  const { field: cryptoAmount1 } = useController({
    name: 'cryptoAmount1',
    control,
    rules: cryptoInputValidation1,
  })
  const { field: cryptoAmount2 } = useController({
    name: 'cryptoAmount2',
    control,
    rules: cryptoInputValidation2,
  })
  const { field: fiatAmount1 } = useController({
    name: 'fiatAmount1',
    control,
    rules: fiatInputValidation1,
  })
  const { field: fiatAmount2 } = useController({
    name: 'fiatAmount2',
    control,
    rules: fiatInputValidation2,
  })
  const cryptoError1 = get(errors, 'cryptoAmount1.message', null)
  const cryptoError2 = get(errors, 'cryptoAmount2.message', null)
  const fiatError1 = get(errors, 'fiatAmount1.message', null)
  const fiatError2 = get(errors, 'fiatAmount2.message', null)
  const fieldError = cryptoError1 || cryptoError2 || fiatError1 || fiatError2

  const handleInputChange = (value: string, isForAsset1: boolean, isFiat?: boolean) => {
    const assetMarketData = isForAsset1 ? marketData1 : marketData2
    const fiatField = isForAsset1 ? Field.FiatAmount1 : Field.FiatAmount2
    const cryptoField = isForAsset1 ? Field.CryptoAmount1 : Field.CryptoAmount2

    // for keeping inputs synced
    const otherFiatInput = !isForAsset1 ? Field.FiatAmount1 : Field.FiatAmount2
    const otherCryptoInput = !isForAsset1 ? Field.CryptoAmount1 : Field.CryptoAmount2
    const otherAssetMarketData = !isForAsset1 ? marketData1 : marketData2
    if (isFiat) {
      setValue(fiatField, value, { shouldValidate: true })
      setValue(cryptoField, bnOrZero(value).div(assetMarketData.price).toString(), {
        shouldValidate: true,
      })
      if (syncPair) {
        setValue(otherFiatInput, value, { shouldValidate: true })
        setValue(otherCryptoInput, bnOrZero(value).div(otherAssetMarketData.price).toString(), {
          shouldValidate: true,
        })
      }
    } else {
      setValue(fiatField, bnOrZero(value).times(assetMarketData.price).toString(), {
        shouldValidate: true,
      })
      setValue(cryptoField, value, {
        shouldValidate: true,
      })
      if (syncPair) {
        const fiatValue = bnOrZero(value).times(assetMarketData.price).toString()
        setValue(otherFiatInput, fiatValue, {
          shouldValidate: true,
        })
        setValue(otherCryptoInput, bnOrZero(fiatValue).div(otherAssetMarketData.price).toString(), {
          shouldValidate: true,
        })
      }
    }
  }

  const handlePercentClick = (percent: number, isForAsset1: boolean) => {
    const asssetMarketData = isForAsset1 ? marketData1 : marketData2
    const fiatField = isForAsset1 ? Field.FiatAmount1 : Field.FiatAmount2
    const cryptoField = isForAsset1 ? Field.CryptoAmount1 : Field.CryptoAmount2
    const cryptoAmount = bnOrZero(
      isForAsset1 ? cryptoAmountAvailable1 : cryptoAmountAvailable2,
    ).times(percent)
    const fiatAmount = bnOrZero(cryptoAmount).times(asssetMarketData.price)
    setValue(fiatField, fiatAmount.toString(), {
      shouldValidate: true,
    })
    setValue(cryptoField, cryptoAmount.toString(), {
      shouldValidate: true,
    })
    if (syncPair) {
      // for keeping inputs synced
      const otherFiatInput = !isForAsset1 ? Field.FiatAmount1 : Field.FiatAmount2
      const otherCryptoInput = !isForAsset1 ? Field.CryptoAmount1 : Field.CryptoAmount2
      const otherAssetMarketData = !isForAsset1 ? marketData1 : marketData2
      setValue(otherFiatInput, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(otherCryptoInput, fiatAmount.div(otherAssetMarketData.price).toString(), {
        shouldValidate: true,
      })
    }
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
            cryptoAmount={cryptoAmount1?.value}
            onChange={(value, isFiat) => handleInputChange(value, true, isFiat)}
            fiatAmount={fiatAmount1?.value}
            showFiatAmount={true}
            assetId={asset1.assetId}
            assetIcon={asset1.icon}
            assetSymbol={asset1.symbol}
            balance={cryptoAmountAvailable1}
            fiatBalance={fiatAmountAvailable1}
            onAccountIdChange={handleAccountIdChange}
            onMaxClick={value => handlePercentClick(value, true)}
            percentOptions={percentOptions}
            errors={cryptoError1 || fiatError1}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={cryptoAmount2?.value}
            onChange={(value, isFiat) => handleInputChange(value, false, isFiat)}
            fiatAmount={fiatAmount2?.value}
            showFiatAmount={true}
            assetId={asset2.assetId}
            assetIcon={asset2.icon}
            assetSymbol={asset2.symbol}
            balance={cryptoAmountAvailable2}
            fiatBalance={fiatAmountAvailable2}
            onAccountIdChange={handleAccountIdChange}
            onMaxClick={value => handlePercentClick(value, false)}
            percentOptions={percentOptions}
            errors={cryptoError2 || fiatError2}
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
