import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useUniV2LiquidityPool } from 'features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useCallback, useContext, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { getAddress } from 'viem'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UniV2WithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

const percentOptions = [0.25, 0.5, 0.75, 1]
const percentOptionsEmpty: number[] = []

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
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

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, lpAsset?.assetId),
  )
  const asset0MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId0),
  )
  const asset1MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId1),
  )

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
  ).times(marketDataUserCurrency?.[lpAssetId]?.price ?? '0')

  // user info
  const filter = useMemo(
    () => ({ assetId: uniV2Opportunity?.assetId ?? '', accountId: accountId ?? '' }),
    [uniV2Opportunity?.assetId, accountId],
  )
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, filter),
  )

  const cryptoAmountAvailable = useMemo(
    () => bn(fromBaseUnit(balance, lpAsset.precision)),
    [balance, lpAsset.precision],
  )

  const getWithdrawGasEstimateCryptoPrecision = useCallback(
    async (withdraw: WithdrawValues) => {
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
    },
    [asset0AmountCryptoPrecision, asset1AmountCryptoPrecision, feeAsset.precision, getWithdrawFees],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(uniV2Opportunity && dispatch)) return
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
        MixPanelEvent.WithdrawContinue,
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
        const lpAssetContractAddress = getAddress(fromAssetId(lpAssetId).assetReference)

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
    },
    [
      asset0AmountCryptoPrecision,
      asset1AmountCryptoPrecision,
      assetId0,
      assetId1,
      assets,
      dispatch,
      feeAsset.precision,
      getApproveFees,
      getWithdrawGasEstimateCryptoPrecision,
      lpAllowance,
      lpAsset.precision,
      lpAssetId,
      onNext,
      uniV2Opportunity,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handlePercentClick = useCallback(
    (percent: number) => {
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
    },
    [
      cryptoAmountAvailable,
      fiatAmountAvailable,
      setValue,
      uniV2Opportunity?.underlyingToken0AmountCryptoBaseUnit,
      uniV2Opportunity?.underlyingToken1AmountCryptoBaseUnit,
    ],
  )

  const handleInputChange = useCallback(
    (value: string, isFiat?: boolean) => {
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
    },
    [
      cryptoAmountAvailable,
      fiatAmountAvailable,
      uniV2Opportunity?.underlyingToken0AmountCryptoBaseUnit,
      uniV2Opportunity?.underlyingToken1AmountCryptoBaseUnit,
    ],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${lpAsset.precision}`)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance, lpAsset.precision],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const _value = bnOrZero(value)
      const fiat = fiatAmountAvailable
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [fiatAmountAvailable],
  )

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount },
    }),
    [validateCryptoAmount],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount },
    }),
    [validateFiatAmount],
  )

  if (!state || !dispatch || !uniV2Opportunity?.icons || !lpAsset) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={lpAsset}
        icons={uniV2Opportunity.icons}
        cryptoAmountAvailable={cryptoAmountAvailable.toFixed()}
        cryptoInputValidation={cryptoInputValidation}
        fiatAmountAvailable={fiatAmountAvailable.toString()}
        fiatInputValidation={fiatInputValidation}
        marketData={assetMarketData}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !uniV2Opportunity}
        percentOptions={percentOptions}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      >
        <>
          <Text translation='common.receive' />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            assetId={asset0.assetId}
            cryptoAmount={asset0AmountCryptoPrecision}
            fiatAmount={bnOrZero(asset0AmountCryptoPrecision)
              .times(asset0MarketData.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetIcon={asset0.icon}
            assetSymbol={asset0.symbol}
            balance={fromBaseUnit(
              bnOrZero(uniV2Opportunity.underlyingToken0AmountCryptoBaseUnit),
              assets[assetId0]?.precision ?? 0,
            )}
            fiatBalance={bn(
              fromBaseUnit(
                uniV2Opportunity?.underlyingToken0AmountCryptoBaseUnit ?? '0',
                asset0.precision,
              ),
            )
              .times(asset0MarketData.price)
              .toFixed(2)}
            percentOptions={percentOptionsEmpty}
            isReadOnly={true}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            assetId={asset1.assetId}
            cryptoAmount={asset1AmountCryptoPrecision}
            fiatAmount={bnOrZero(asset1AmountCryptoPrecision)
              .times(asset1MarketData.price)
              .toFixed(2)}
            showFiatAmount={true}
            assetIcon={asset1.icon}
            assetSymbol={asset1.symbol}
            balance={fromBaseUnit(
              bnOrZero(uniV2Opportunity.underlyingToken1AmountCryptoBaseUnit),
              assets[assetId1]?.precision ?? 0,
            )}
            fiatBalance={bn(
              fromBaseUnit(
                uniV2Opportunity?.underlyingToken1AmountCryptoBaseUnit ?? '0',
                asset1.precision,
              ),
            )
              .times(asset1MarketData.price)
              .toFixed(2)}
            percentOptions={percentOptionsEmpty}
            isReadOnly={true}
          />
        </>
      </ReusableWithdraw>
    </FormProvider>
  )
}
