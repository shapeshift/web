import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip/dist/accountId/accountId'
import get from 'lodash/get'
import { calculateYearlyYield } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import type { ControllerProps } from 'react-hook-form'
import { useController, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Allocation } from 'components/DeFi/components/Allocation'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { FormField } from 'components/DeFi/components/FormField'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PairIcons } from '../PairIcons/PairIcons'

type DepositProps = {
  accountId?: AccountId | undefined
  asset1: Asset
  asset2: Asset
  destAsset: Asset
  // Estimated apy (Deposit Only)
  apy: string
  // Use form values to calculate allocation fraction
  calculateAllocations?(
    asset: Asset,
    amount: string,
  ): { allocationFraction: string; shareOutAmount: string } | undefined
  // Users available amount
  cryptoAmountAvailable1Precision: string
  cryptoAmountAvailable2Precision: string
  // Validation rules for the crypto input
  cryptoInputValidation1?: ControllerProps['rules']
  cryptoInputValidation2?: ControllerProps['rules']

  // Validation rules for the fiat input
  fiatInputValidation1?: ControllerProps['rules']
  fiatInputValidation2?: ControllerProps['rules']
  // enables slippage UI (defaults to true)
  enableSlippage?: boolean
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
  AllocationFraction = 'allocationFraction',
  ShareOutAmount = 'shareOutAmount',
}

export type DepositValues = {
  [Field.FiatAmount1]: string
  [Field.CryptoAmount1]: string
  [Field.FiatAmount2]: string
  [Field.CryptoAmount2]: string
  [Field.AllocationFraction]: string
  [Field.ShareOutAmount]: string
}

export const PairDepositWithAllocation = ({
  accountId,
  apy,
  asset1,
  asset2,
  calculateAllocations,
  cryptoAmountAvailable1Precision,
  cryptoAmountAvailable2Precision,
  cryptoInputValidation1,
  cryptoInputValidation2,
  destAsset,
  fiatInputValidation1,
  fiatInputValidation2,
  icons,
  isLoading,
  onAccountIdChange: handleAccountIdChange,
  onContinue,
  percentOptions,
  syncPair = true,
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
      [Field.AllocationFraction]: '',
      [Field.ShareOutAmount]: '',
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

  const { field: allocationFraction } = useController({
    name: 'allocationFraction',
    control,
  })
  const { field: shareOutAmount } = useController({
    name: 'shareOutAmount',
    control,
  })
  const cryptoError1 = get(errors, 'cryptoAmount1.message', null)
  const cryptoError2 = get(errors, 'cryptoAmount2.message', null)
  const fiatError1 = get(errors, 'fiatAmount1.message', null)
  const fiatError2 = get(errors, 'fiatAmount2.message', null)
  const fieldError = cryptoError1 || cryptoError2 || fiatError1 || fiatError2

  const asset1MarketData = useAppSelector(state => selectMarketDataById(state, asset1.assetId))
  const asset2MarketData = useAppSelector(state => selectMarketDataById(state, asset2.assetId))

  const handleInputChange = (value: string, isForAsset1: boolean, isFiat?: boolean) => {
    const assetMarketData = isForAsset1 ? asset1MarketData : asset2MarketData
    const fiatField = isForAsset1 ? Field.FiatAmount1 : Field.FiatAmount2
    const cryptoField = isForAsset1 ? Field.CryptoAmount1 : Field.CryptoAmount2
    const selectedAsset = isForAsset1 ? asset1 : asset2

    // for keeping inputs synced
    const otherFiatInput = !isForAsset1 ? Field.FiatAmount1 : Field.FiatAmount2
    const otherCryptoInput = !isForAsset1 ? Field.CryptoAmount1 : Field.CryptoAmount2
    const otherAssetMarketData = !isForAsset1 ? asset1MarketData : asset2MarketData
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
    if (!calculateAllocations) return

    const allocations = calculateAllocations(selectedAsset, value)
    if (!allocations) return

    setValue(Field.AllocationFraction, allocations.allocationFraction)
    setValue(Field.ShareOutAmount, allocations.shareOutAmount)
  }

  const handlePercentClick = (percent: number, isForAsset1: boolean) => {
    const assetMarketData = isForAsset1 ? asset1MarketData : asset2MarketData
    const fiatField = isForAsset1 ? Field.FiatAmount1 : Field.FiatAmount2
    const cryptoField = isForAsset1 ? Field.CryptoAmount1 : Field.CryptoAmount2
    const selectedAsset = isForAsset1 ? asset1 : asset2

    const cryptoAmount = bnOrZero(
      isForAsset1 ? cryptoAmountAvailable1Precision : cryptoAmountAvailable2Precision,
    ).times(percent)
    const fiatAmount = bnOrZero(cryptoAmount).times(assetMarketData.price)
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
      const otherAssetMarketData = !isForAsset1 ? asset1MarketData : asset2MarketData
      setValue(otherFiatInput, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(otherCryptoInput, fiatAmount.div(otherAssetMarketData.price).toString(), {
        shouldValidate: true,
      })
    }
    if (!calculateAllocations) return
    ;(async () => {
      const allocations = await calculateAllocations(selectedAsset, cryptoAmount.toString())
      if (!allocations) return

      setValue(Field.AllocationFraction, allocations.allocationFraction)
      setValue(Field.ShareOutAmount, allocations.shareOutAmount)
    })()
  }

  const cryptoYield = calculateYearlyYield(apy, values.cryptoAmount1)
  const fiatYield = bnOrZero(cryptoYield).times(asset1MarketData.price).toFixed(2)
  const fiatAmountAvailable1 = bnOrZero(cryptoAmountAvailable1Precision)
    .times(asset1MarketData.price)
    .toString()
  const fiatAmountAvailable2 = bnOrZero(cryptoAmountAvailable2Precision)
    .times(asset1MarketData.price)
    .toString()

  return (
    <>
      <Stack spacing={6} as='form' width='full' onSubmit={handleSubmit(onContinue)}>
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
            balance={cryptoAmountAvailable1Precision}
            fiatBalance={fiatAmountAvailable1}
            onAccountIdChange={handleAccountIdChange}
            onPercentOptionClick={value => handlePercentClick(value, true)}
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
            balance={cryptoAmountAvailable2Precision}
            fiatBalance={fiatAmountAvailable2}
            onAccountIdChange={handleAccountIdChange}
            onPercentOptionClick={value => handlePercentClick(value, false)}
            percentOptions={percentOptions}
            errors={cryptoError2 || fiatError2}
          />
        </FormField>
        <Allocation
          {...(accountId ? { accountId } : {})}
          allocationFraction={allocationFraction?.value}
          assetId={destAsset.assetId}
          assetSymbol={`${asset1.symbol}-${asset2.symbol}`}
          cryptoAmount={shareOutAmount.value}
          errors={cryptoError2 || fiatError2}
          fiatAmount={bnOrZero(fiatAmount1?.value).plus(bnOrZero(fiatAmount2?.value)).toString()}
          icons={icons}
          isReadOnly={true}
          onAccountIdChange={handleAccountIdChange}
          showFiatAmount={true}
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
