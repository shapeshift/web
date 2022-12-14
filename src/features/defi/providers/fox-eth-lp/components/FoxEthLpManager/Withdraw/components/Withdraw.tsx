import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useContext, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAssetById,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
  selectMarketDataSortedByMarketCap,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxEthLpWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({ namespace: ['Withdraw'] })

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const { state, dispatch } = useContext(WithdrawContext)
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const foxEthLpOpportunityFilter = useMemo(
    () => ({
      lpId: foxEthLpAssetId,
      assetId: foxEthLpAssetId,
      accountId,
    }),
    [accountId],
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, foxEthLpOpportunityFilter),
  )

  const { allowance, getApproveGasData, getWithdrawGasData } = useFoxEthLiquidityPool(accountId)
  const [foxAmountCryptoBaseUnit, setFoxAmountCryptoBaseUnit] = useState('0')
  const [ethAmountCryptoBaseUnit, setEthAmountCryptoBaseUnit] = useState('0')

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const asset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, asset.assetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  const foxAmountCryptoPrecision = useMemo(
    () => bnOrZero(foxAmountCryptoBaseUnit).div(bn(10).pow(foxAsset.precision)).toFixed(),
    [foxAmountCryptoBaseUnit, foxAsset.precision],
  )
  const ethAmountCryptoPrecision = useMemo(
    () => bnOrZero(ethAmountCryptoBaseUnit).div(bn(10).pow(ethAsset.precision)).toFixed(),

    [ethAmountCryptoBaseUnit, ethAsset.precision],
  )

  const fiatAmountAvailable = bnOrZero(foxEthLpOpportunity?.cryptoAmountBaseUnit)
    .div(bn(10).pow(asset.precision))
    .times(marketData?.[foxEthLpAssetId]?.price ?? '0')
    .toString()

  // user info
  const filter = useMemo(
    () => ({ assetId: foxEthLpOpportunity?.assetId ?? '', accountId: accountId ?? '' }),
    [foxEthLpOpportunity?.assetId, accountId],
  )
  const cryptoAmountAvailableBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, filter),
  )

  if (!state || !dispatch || !foxEthLpOpportunity?.icons) return null

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    try {
      const fee = await getWithdrawGasData(
        withdraw.cryptoAmountBaseUnit,
        foxAmountCryptoBaseUnit,
        ethAmountCryptoBaseUnit,
      )
      if (!fee) return
      return bnOrZero(fee.average.txFee).div(bn(10).pow(ethAsset.precision)).toPrecision()
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      moduleLogger.error(error, 'FoxEthLpWithdraw:getWithdrawGasEstimate error:')
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!foxEthLpOpportunity) return
    // set withdraw state for future use
    dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: true })
    dispatch({
      type: FoxEthLpWithdrawActionType.SET_WITHDRAW,
      payload: {
        lpAmountCryptoBaseUnit: formValues.cryptoAmountBaseUnit,
        foxAmountCryptoBaseUnit,
        ethAmountCryptoBaseUnit,
      },
    })
    const lpAllowance = await allowance(true)
    const allowanceAmount = bnOrZero(lpAllowance).div(`1e+${asset.precision}`)

    // Skip approval step if user allowance is greater than or equal requested deposit amount
    if (allowanceAmount.gte(bnOrZero(formValues.cryptoAmountBaseUnit))) {
      const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
      if (!estimatedGasCrypto) {
        dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
        return
      }
      dispatch({
        type: FoxEthLpWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
    } else {
      const estimatedGasCrypto = await getApproveGasData(true)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxEthLpWithdrawActionType.SET_APPROVE,
        payload: {
          estimatedGasCrypto: bnOrZero(estimatedGasCrypto.average.txFee)
            .div(bn(10).pow(ethAsset.precision))
            .toPrecision(),
        },
      })
      onNext(DefiStep.Approve)
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const handlePercentClick = (percent: number) => {
    const cryptoAmountBaseUnit = bnOrZero(cryptoAmountAvailableBaseUnit).times(percent).toString()
    const fiatAmount = bnOrZero(fiatAmountAvailable)
      .div(bn(10).pow(asset.precision))
      .times(percent)
      .toString()

    setValue(Field.FiatAmount, fiatAmount, { shouldValidate: true })
    setValue(Field.CryptoAmountBaseUnit, cryptoAmountBaseUnit, { shouldValidate: true })
    if (
      foxEthLpOpportunity?.underlyingToken1AmountCryptoBaseUnit &&
      foxEthLpOpportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setFoxAmountCryptoBaseUnit(
        bnOrZero(percent).times(foxEthLpOpportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(),
      )
      setEthAmountCryptoBaseUnit(
        bnOrZero(percent).times(foxEthLpOpportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(),
      )
    }
  }

  const handleInputChange = (value: string, isFiat?: boolean) => {
    const percentage = bnOrZero(value).div(
      bnOrZero(isFiat ? fiatAmountAvailable : cryptoAmountAvailableBaseUnit),
    )
    if (
      foxEthLpOpportunity?.underlyingToken1AmountCryptoBaseUnit &&
      foxEthLpOpportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setFoxAmountCryptoBaseUnit(
        percentage.times(foxEthLpOpportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(8),
      )
      setEthAmountCryptoBaseUnit(
        percentage.times(foxEthLpOpportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(8),
      )
    }
  }

  const validateCryptoAmount = (value: string) => {
    const cryptoAmountAvailablePrecision = bnOrZero(cryptoAmountAvailableBaseUnit).div(
      `1e+${asset.precision}`,
    )
    const _value = bnOrZero(value)
    const hasValidBalance =
      cryptoAmountAvailablePrecision.gt(0) &&
      _value.gt(0) &&
      cryptoAmountAvailablePrecision.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const fiat = bnOrZero(fiatAmountAvailable)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={asset}
        icons={foxEthLpOpportunity.icons}
        cryptoAmountAvailableBaseUnit={cryptoAmountAvailableBaseUnit}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={fiatAmountAvailable}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={assetMarketData}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !foxEthLpOpportunity}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      >
        <>
          <Text translation='common.receive' />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmountBaseUnit={foxAmountCryptoBaseUnit}
            fiatAmount={bnOrZero(foxAmountCryptoPrecision).times(foxMarketData.price).toFixed(2)}
            showFiatAmount={true}
            assetIcon={foxAsset.icon}
            assetSymbol={foxAsset.symbol}
            cryptoBalanceBaseUnit={foxEthLpOpportunity.underlyingToken1AmountCryptoBaseUnit}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                foxEthLpOpportunity?.underlyingToken1AmountCryptoBaseUnit ?? '0',
                foxAsset.precision,
              ),
            )
              .times(foxMarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmountBaseUnit={ethAmountCryptoBaseUnit}
            fiatAmount={bnOrZero(ethAmountCryptoPrecision).times(ethMarketData.price).toFixed(2)}
            showFiatAmount={true}
            assetIcon={ethAsset.icon}
            assetSymbol={ethAsset.symbol}
            cryptoBalanceBaseUnit={foxEthLpOpportunity.underlyingToken0AmountCryptoBaseUnit}
            fiatBalance={bnOrZero(
              fromBaseUnit(
                foxEthLpOpportunity?.underlyingToken0AmountCryptoBaseUnit ?? '0',
                ethAsset.precision,
              ),
            )
              .times(ethMarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
        </>
      </ReusableWithdraw>
    </FormProvider>
  )
}
