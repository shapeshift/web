import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
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
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type {
  LpEarnOpportunityType,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PairIcons } from '../PairIcons/PairIcons'

type DepositProps = {
  accountId?: AccountId | undefined
  opportunity: LpEarnOpportunityType | StakingEarnOpportunityType
  destAssetId: AssetId
  // Use form values to calculate allocation fraction
  calculateAllocations?(
    asset: Asset,
    amount: string,
  ):
    | {
        allocationFraction: string
        shareOutAmountBaseUnit: string
        shareOutAmountCryptoPrecision: string
      }
    | undefined
  // Validation rules for the crypto input
  cryptoInputValidation0?: ControllerProps['rules']
  cryptoInputValidation1?: ControllerProps['rules']
  // Validation rules for the fiat input
  fiatInputValidation0?: ControllerProps['rules']
  fiatInputValidation1?: ControllerProps['rules']
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
}

enum Field {
  FiatAmount0 = 'fiatAmount0',
  FiatAmount1 = 'fiatAmount1',
  CryptoAmount0 = 'cryptoAmount0',
  CryptoAmount1 = 'cryptoAmount1',
  AllocationFraction = 'allocationFraction',
  ShareOutAmount = 'shareOutAmount',
}

export type DepositValues = {
  [Field.FiatAmount0]: string
  [Field.CryptoAmount0]: string
  [Field.FiatAmount1]: string
  [Field.CryptoAmount1]: string
  [Field.AllocationFraction]: string
  [Field.ShareOutAmount]: string
}

export const PairDepositWithAllocation = ({
  accountId,
  calculateAllocations,
  cryptoInputValidation0,
  cryptoInputValidation1,
  destAssetId,
  fiatInputValidation0,
  fiatInputValidation1,
  isLoading,
  opportunity,
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
      [Field.FiatAmount0]: '',
      [Field.FiatAmount1]: '',
      [Field.CryptoAmount0]: '',
      [Field.CryptoAmount1]: '',
      [Field.AllocationFraction]: '',
      [Field.ShareOutAmount]: '',
    },
  })

  const apy = opportunity.apy?.toString() ?? ''
  const destAsset: Asset | undefined = useAppSelector(state => selectAssetById(state, destAssetId))
  const asset0 = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetIds[0] ?? ''),
  )
  const asset1 = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetIds[1] ?? ''),
  )

  const underlyingAsset0Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      assetId: opportunity?.underlyingAssetIds[0],
      accountId: accountId ?? '',
    }),
  )
  const underlyingAsset1Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      assetId: opportunity?.underlyingAssetIds[1],
      accountId: accountId ?? '',
    }),
  )

  const underlyingAsset0CryptoAmountAvailablePrecision = bnOrZero(underlyingAsset0Balance)
    .div(bn(10).pow(asset0?.precision ?? '0'))
    .toString()

  const underlyingAsset1CryptoAmountAvailablePrecision = bnOrZero(underlyingAsset1Balance)
    .div(bn(10).pow(asset1?.precision ?? '0'))
    .toString()

  const asset0MarketData = useAppSelector(state =>
    selectMarketDataById(state, asset0?.assetId ?? ''),
  )
  const asset1MarketData = useAppSelector(state =>
    selectMarketDataById(state, asset1?.assetId ?? ''),
  )

  const icons = opportunity.icons

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

  const { field: allocationFraction } = useController({
    name: 'allocationFraction',
    control,
  })
  const { field: shareOutAmount } = useController({
    name: 'shareOutAmount',
    control,
  })

  if (!(asset0 && asset1 && destAsset)) return null

  const cryptoError0 = get(errors, 'cryptoAmount0.message', null)
  const cryptoError1 = get(errors, 'cryptoAmount1.message', null)
  const fiatError0 = get(errors, 'fiatAmount0.message', null)
  const fiatError1 = get(errors, 'fiatAmount1.message', null)
  const fieldError = cryptoError0 || cryptoError1 || fiatError0 || fiatError1

  const handleInputChange = (value: string, isForAsset0: boolean, isFiat?: boolean) => {
    const assetMarketData = isForAsset0 ? asset0MarketData : asset1MarketData
    const fiatField = isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
    const cryptoField = isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1
    const selectedAsset = isForAsset0 ? asset0 : asset1

    // for keeping inputs synced
    const otherFiatInput = !isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
    const otherCryptoInput = !isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1
    const otherAssetMarketData = !isForAsset0 ? asset0MarketData : asset1MarketData
    const otherAsset = !isForAsset0 ? asset0 : asset1
    if (isFiat) {
      setValue(fiatField, value, { shouldValidate: true })
      setValue(
        cryptoField,
        bnOrZero(value).div(assetMarketData.price).toFixed(selectedAsset.precision),
        {
          shouldValidate: true,
        },
      )
      if (syncPair) {
        setValue(otherFiatInput, value, { shouldValidate: true })
        setValue(
          otherCryptoInput,
          value
            ? bnOrZero(value).div(otherAssetMarketData.price).toFixed(otherAsset.precision)
            : '',
          {
            shouldValidate: true,
          },
        )
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
        setValue(
          otherCryptoInput,
          value
            ? bnOrZero(fiatValue).div(otherAssetMarketData.price).toFixed(otherAsset.precision)
            : '',
          {
            shouldValidate: true,
          },
        )
      }
    }
    if (!calculateAllocations) return

    const allocations = calculateAllocations(selectedAsset, value)
    if (!allocations) return

    setValue(Field.AllocationFraction, allocations.allocationFraction)
    setValue(Field.ShareOutAmount, allocations.shareOutAmountCryptoPrecision)
  }

  const handlePercentClick = (percent: number, isForAsset0: boolean) => {
    const assetMarketData = isForAsset0 ? asset0MarketData : asset1MarketData
    const fiatField = isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
    const cryptoField = isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1
    const selectedAsset = isForAsset0 ? asset0 : asset1

    const cryptoAmount = bnOrZero(
      isForAsset0
        ? underlyingAsset0CryptoAmountAvailablePrecision
        : underlyingAsset1CryptoAmountAvailablePrecision,
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
      const otherFiatInput = !isForAsset0 ? Field.FiatAmount0 : Field.FiatAmount1
      const otherCryptoInput = !isForAsset0 ? Field.CryptoAmount0 : Field.CryptoAmount1
      const otherAssetMarketData = !isForAsset0 ? asset0MarketData : asset1MarketData
      setValue(otherFiatInput, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(otherCryptoInput, fiatAmount.div(otherAssetMarketData.price).toString(), {
        shouldValidate: true,
      })
    }
    if (!calculateAllocations) return
    ;(() => {
      const allocations = calculateAllocations(selectedAsset, cryptoAmount.toString())
      if (!allocations) return

      setValue(Field.AllocationFraction, allocations.allocationFraction)
      setValue(Field.ShareOutAmount, allocations.shareOutAmountCryptoPrecision)
    })()
  }

  const cryptoYield = calculateYearlyYield(apy, values.cryptoAmount0)
  const fiatYield = bnOrZero(cryptoYield).times(asset0MarketData.price).toFixed(2)
  const fiatAmountAvailable0 = bnOrZero(underlyingAsset0CryptoAmountAvailablePrecision)
    .times(asset0MarketData.price)
    .toString()
  const fiatAmountAvailable1 = bnOrZero(underlyingAsset1CryptoAmountAvailablePrecision)
    .times(asset1MarketData.price)
    .toString()

  return (
    <>
      <Stack spacing={6} as='form' width='full' onSubmit={handleSubmit(onContinue)}>
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
            balance={underlyingAsset0CryptoAmountAvailablePrecision}
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
            balance={underlyingAsset1CryptoAmountAvailablePrecision}
            fiatBalance={fiatAmountAvailable1}
            onAccountIdChange={handleAccountIdChange}
            onPercentOptionClick={value => handlePercentClick(value, false)}
            percentOptions={percentOptions}
            errors={cryptoError1 || fiatError1}
          />
        </FormField>
        <Allocation
          {...(accountId ? { accountId } : {})}
          allocationFraction={allocationFraction?.value}
          assetId={destAsset.assetId}
          assetSymbol={`${asset0.symbol}-${asset1.symbol}`}
          cryptoAmount={shareOutAmount.value}
          errors={cryptoError1 || fiatError1}
          fiatAmount={bnOrZero(fiatAmount1?.value).plus(bnOrZero(fiatAmount1?.value)).toString()}
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
