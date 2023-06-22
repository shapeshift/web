import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { ethers } from 'ethers'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useUniV2LiquidityPool } from 'features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useContext, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UniV2WithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
  const { state, dispatch } = useContext(WithdrawContext)
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const lpAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const assets = useAppSelector(selectAssets)

  const uniV2OpportunityFilter = useMemo(
    () => ({
      lpId: lpAssetId as LpId,
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )
  const uniV2Opportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, uniV2OpportunityFilter),
  )

  const assetId0 = uniV2Opportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = uniV2Opportunity?.underlyingAssetIds[1] ?? ''

  const { lpAllowance, getApproveFees, getWithdrawFees } = useUniV2LiquidityPool({
    accountId: accountId ?? '',
    assetId0: uniV2Opportunity?.underlyingAssetIds[0] ?? '',
    assetId1: uniV2Opportunity?.underlyingAssetIds[1] ?? '',
    lpAssetId,
  })
  const [asset1AmountCryptoBaseUnit, setAsset1AmountCryptoBaseUnit] = useState('0')
  const [asset0AmountCryptoBaseUnit, setAsset0AmountCryptoBaseUnit] = useState('0')

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))

  if (!feeAsset) throw new Error(`Asset not found for AssetId ${feeAssetId}`)
  if (!lpAsset) throw new Error(`Asset not found for AssetId ${lpAssetId}`)
  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0}`)
  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1}`)

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, lpAsset?.assetId))
  const asset0MarketData = useAppSelector(state => selectMarketDataById(state, assetId0))
  const asset1MarketData = useAppSelector(state => selectMarketDataById(state, assetId1))

  const asset1AmountCryptoPrecision = useMemo(
    () => fromBaseUnit(asset1AmountCryptoBaseUnit, asset1.precision),
    [asset1AmountCryptoBaseUnit, asset1.precision],
  )
  const asset0AmountCryptoPrecision = useMemo(
    () => fromBaseUnit(asset0AmountCryptoBaseUnit, asset0.precision),
    [asset0.precision, asset0AmountCryptoBaseUnit],
  )

  const fiatAmountAvailable = bn(
    fromBaseUnit(bnOrZero(uniV2Opportunity?.cryptoAmountBaseUnit), lpAsset.precision),
  ).times(marketData?.[lpAssetId]?.price ?? '0')

  // user info
  const filter = useMemo(
    () => ({ assetId: uniV2Opportunity?.assetId ?? '', accountId: accountId ?? '' }),
    [uniV2Opportunity?.assetId, accountId],
  )
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, filter),
  )

  if (!state || !dispatch || !uniV2Opportunity?.icons || !lpAsset) return null

  const cryptoAmountAvailable = bn(fromBaseUnit(balance, lpAsset.precision))

  const getWithdrawGasEstimateCryptoPrecision = async (withdraw: WithdrawValues) => {
    try {
      const fees = await getWithdrawFees(
        withdraw.cryptoAmount,
        asset0AmountCryptoPrecision,
        asset1AmountCryptoPrecision,
      )
      if (!fees) return
      return fromBaseUnit(fees.networkFeeCryptoBaseUnit, feeAsset.precision)
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error(error)
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!uniV2Opportunity) return
    // set withdraw state for future use
    dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: true })
    dispatch({
      type: UniV2WithdrawActionType.SET_WITHDRAW,
      payload: {
        lpAmount: formValues.cryptoAmount,
        lpFiatAmount: formValues.fiatAmount,
        asset1Amount: asset1AmountCryptoPrecision,
        asset0Amount: asset0AmountCryptoPrecision,
      },
    })
    const lpAllowanceCryptoBaseUnit = await lpAllowance()
    const lpAllowanceAmountCryptoPrecision = fromBaseUnit(
      bnOrZero(lpAllowanceCryptoBaseUnit),
      lpAsset.precision,
    )

    trackOpportunityEvent(
      MixPanelEvents.WithdrawContinue,
      {
        opportunity: uniV2Opportunity,
        fiatAmounts: [formValues.fiatAmount],
        cryptoAmounts: [
          { assetId: lpAssetId, amountCryptoHuman: formValues.cryptoAmount },
          { assetId: assetId1, amountCryptoHuman: asset1AmountCryptoPrecision },
          { assetId: assetId0, amountCryptoHuman: asset0AmountCryptoPrecision },
        ],
      },
      assets,
    )

    // Skip approval step if user allowance is greater than or equal requested withdraw amount
    if (bn(lpAllowanceAmountCryptoPrecision).gte(bnOrZero(formValues.cryptoAmount))) {
      const estimatedGasCryptoPrecision = await getWithdrawGasEstimateCryptoPrecision(formValues)
      if (!estimatedGasCryptoPrecision) {
        dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: false })
        return
      }
      dispatch({
        type: UniV2WithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCryptoPrecision },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: false })
    } else {
      const lpAssetContractAddress = ethers.utils.getAddress(fromAssetId(lpAssetId).assetReference)

      const fees = await getApproveFees(lpAssetContractAddress)
      if (!fees) return

      dispatch({
        type: UniV2WithdrawActionType.SET_APPROVE,
        payload: {
          estimatedGasCryptoPrecision: fromBaseUnit(
            fees.networkFeeCryptoBaseUnit,
            feeAsset.precision,
          ),
        },
      })
      onNext(DefiStep.Approve)
      dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const handlePercentClick = (percent: number) => {
    const cryptoAmount = cryptoAmountAvailable.times(percent).toFixed()
    const fiatAmount = fiatAmountAvailable.times(percent).toString()

    setValue(Field.FiatAmount, fiatAmount, { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount, { shouldValidate: true })
    if (
      uniV2Opportunity?.underlyingToken1AmountCryptoBaseUnit &&
      uniV2Opportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setAsset1AmountCryptoBaseUnit(
        bnOrZero(percent).times(uniV2Opportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(),
      )
      setAsset0AmountCryptoBaseUnit(
        bnOrZero(percent).times(uniV2Opportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(),
      )
    }
  }

  const handleInputChange = (value: string, isFiat?: boolean) => {
    const percentage = bnOrZero(value).div(
      bnOrZero(isFiat ? fiatAmountAvailable : cryptoAmountAvailable),
    )
    if (
      uniV2Opportunity?.underlyingToken1AmountCryptoBaseUnit &&
      uniV2Opportunity?.underlyingToken0AmountCryptoBaseUnit
    ) {
      setAsset1AmountCryptoBaseUnit(
        percentage.times(uniV2Opportunity.underlyingToken1AmountCryptoBaseUnit).toFixed(8),
      )
      setAsset0AmountCryptoBaseUnit(
        percentage.times(uniV2Opportunity.underlyingToken0AmountCryptoBaseUnit).toFixed(8),
      )
    }
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${lpAsset.precision}`)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const fiat = fiatAmountAvailable
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={lpAsset}
        icons={uniV2Opportunity.icons}
        cryptoAmountAvailable={cryptoAmountAvailable.toFixed()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={fiatAmountAvailable.toString()}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={assetMarketData}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !uniV2Opportunity}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      >
        <>
          <Text translation='common.receive' />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={asset0AmountCryptoPrecision}
            fiatAmount={bnOrZero(asset0AmountCryptoPrecision)
              .times(asset0MarketData.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetIcon={asset0.icon}
            assetSymbol={asset0.symbol}
            balance={fromBaseUnit(
              bnOrZero(uniV2Opportunity.underlyingToken0AmountCryptoBaseUnit),
              assets[uniV2Opportunity?.underlyingAssetIds?.[0] ?? '']?.precision ?? 0,
            )}
            fiatBalance={bn(
              fromBaseUnit(
                uniV2Opportunity?.underlyingToken0AmountCryptoBaseUnit ?? '0',
                asset0.precision,
              ),
            )
              .times(asset0MarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={asset1AmountCryptoPrecision}
            fiatAmount={bnOrZero(asset1AmountCryptoPrecision)
              .times(asset1MarketData.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetIcon={asset1.icon}
            assetSymbol={asset1.symbol}
            balance={fromBaseUnit(
              bnOrZero(uniV2Opportunity.underlyingToken1AmountCryptoBaseUnit),
              assets[uniV2Opportunity?.underlyingAssetIds?.[1] ?? '']?.precision ?? 0,
            )}
            fiatBalance={bn(
              fromBaseUnit(
                uniV2Opportunity?.underlyingToken1AmountCryptoBaseUnit ?? '0',
                asset1.precision,
              ),
            )
              .times(asset1MarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
        </>
      </ReusableWithdraw>
    </FormProvider>
  )
}
