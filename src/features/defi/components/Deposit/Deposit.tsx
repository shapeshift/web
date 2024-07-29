import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import get from 'lodash/get'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo } from 'react'
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

type DepositProps = {
  accountId?: AccountId | undefined
  asset: Asset
  rewardAsset?: Asset
  // Estimated apy (Deposit Only)
  apy: string | undefined
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
  onPercentClick?: (
    percent: number,
  ) => Promise<{ percentageCryptoAmount: string; percentageFiatAmount: string }>
  onMaxClick?: (setValue: UseFormSetValue<DepositValues>) => Promise<void>
  // Array of the % options
  percentOptions: number[]
  isLoading: boolean
  onContinue(values: DepositValues): void
  onBack?(): void
  onCancel(): void
  onChange?({ fiatAmount, cryptoAmount }: { fiatAmount: string; cryptoAmount: string }): void
  inputIcons?: string[]
} & PropsWithChildren

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
  onMaxClick,
  onPercentClick,
  onChange,
  percentOptions,
  inputIcons,
  rewardAsset,
  children,
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

  const handleMaxClick = useCallback(() => onMaxClick!(setValue), [onMaxClick, setValue])

  const values = useWatch({ control })
  const { field: cryptoAmount } = useController<DepositValues>({
    name: 'cryptoAmount',
    control,
    rules: cryptoInputValidation,
  })
  const { field: fiatAmount } = useController<DepositValues>({
    name: 'fiatAmount',
    control,
    rules: fiatInputValidation,
  })
  const cryptoError = get(errors, 'cryptoAmount.message', null)
  const fiatError = get(errors, 'fiatAmount.message', null)
  const fieldError = cryptoError || fiatError

  const handleInputChange = useCallback(
    (value: string, isFiat?: boolean) => {
      if (isFiat) {
        const cryptoAmount = bnOrZero(value).div(marketData.price).toFixed()
        setValue(Field.FiatAmount, value, { shouldValidate: true })
        setValue(Field.CryptoAmount, cryptoAmount, {
          shouldValidate: true,
        })
        onChange && onChange({ cryptoAmount, fiatAmount: value })
      } else {
        const fiatAmount = bnOrZero(value).times(marketData.price).toString()
        setValue(Field.FiatAmount, fiatAmount, {
          shouldValidate: true,
        })
        setValue(Field.CryptoAmount, value, {
          shouldValidate: true,
        })
        onChange && onChange({ fiatAmount, cryptoAmount: value })
      }
    },
    [marketData.price, onChange, setValue],
  )

  const handlePercentClick = useCallback(
    async (percent: number) => {
      const { percentageCryptoAmount, percentageFiatAmount } = await (async () => {
        if (onPercentClick) {
          const {
            percentageCryptoAmount: _percentageCryptoAmount,
            percentageFiatAmount: _percentageFiatAmount,
          } = await onPercentClick(percent)
          return {
            percentageCryptoAmount: bn(_percentageCryptoAmount),
            percentageFiatAmount: _percentageFiatAmount,
          }
        }

        const _percentageCryptoAmount = bnOrZero(cryptoAmountAvailable)
          .times(percent)
          .dp(asset.precision)
        const _percentageFiatAmount = _percentageCryptoAmount.times(marketData.price).toString()

        return {
          percentageCryptoAmount: _percentageCryptoAmount,
          percentageFiatAmount: _percentageFiatAmount,
        }
      })()

      setValue(Field.FiatAmount, percentageFiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, percentageCryptoAmount.toFixed(), {
        shouldValidate: true,
      })
      onChange &&
        onChange({
          fiatAmount: percentageFiatAmount.toString(),
          cryptoAmount: percentageCryptoAmount.toString(),
        })
    },
    [asset.precision, cryptoAmountAvailable, marketData.price, onChange, onPercentClick, setValue],
  )

  const onSubmit = useCallback(
    (values: DepositValues) => {
      onContinue(values)
    },
    [onContinue],
  )

  const cryptoYield = calculateYearlyYield(bnOrZero(apy).toString(), values.cryptoAmount)
  const fiatYield = bnOrZero(cryptoYield).times(marketData.price).toFixed(2)

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  const handleAssetInputChange = useCallback(
    (value: string, isFiat?: boolean) => handleInputChange(value, isFiat),
    [handleInputChange],
  )

  return (
    <>
      <Stack spacing={6} as='form' width='full' onSubmit={handleFormSubmit}>
        <FormField label={translate('modals.deposit.amountToDeposit')}>
          <AssetInput
            accountId={accountId}
            cryptoAmount={cryptoAmount?.value}
            assetId={asset.assetId}
            onAccountIdChange={handleAccountIdChange}
            onChange={handleAssetInputChange}
            {...(onMaxClick ? { onMaxClick: handleMaxClick } : {})}
            fiatAmount={fiatAmount?.value}
            showFiatAmount={true}
            assetIcon={asset.icon}
            assetSymbol={asset.symbol}
            balance={cryptoAmountAvailable}
            fiatBalance={fiatAmountAvailable}
            onPercentOptionClick={handlePercentClick}
            percentOptions={percentOptions}
            icons={inputIcons}
          />
          {apy ? (
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
          ) : null}
        </FormField>
        {children}
        <Button
          size='lg-multiline'
          width='full'
          colorScheme={fieldError ? 'red' : 'blue'}
          isDisabled={!isValid || isLoading}
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
