import type { AccountId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useCallback, useContext, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { assertIsFoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type WithdrawProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const [isExiting, setIsExiting] = useState<boolean>(false)
  const { history: browserHistory, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, chainId, contractAddress } = query

  const assets = useAppSelector(selectAssets)

  const opportunity = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, {
      userStakingId: serializeUserStakingId(
        accountId ?? '',
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference: contractAddress,
        }),
      ),
    }),
  )

  assertIsFoxEthStakingContractAddress(contractAddress)

  const { getUnstakeFees, allowance, getApproveFees } = useFoxFarming(contractAddress)

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const underlyingAsset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )
  if (!underlyingAsset)
    throw new Error(`Asset not found for AssetId ${opportunity?.underlyingAssetId}`)

  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`Fee AssetId not found for ChainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Asset not found for AssetId ${feeAssetId}`)

  const marketData = useAppSelector(state =>
    selectMarketDataById(state, opportunity?.underlyingAssetId ?? ''),
  )

  const amountAvailableCryptoPrecision = useMemo(
    () => fromBaseUnit(bnOrZero(opportunity?.cryptoAmountBaseUnit), underlyingAsset.precision),
    [underlyingAsset.precision, opportunity?.cryptoAmountBaseUnit],
  )

  const getWithdrawGasEstimateCryptoPrecision = useCallback(
    async (withdraw: WithdrawValues) => {
      try {
        const fees = await getUnstakeFees(withdraw.cryptoAmount, isExiting)
        if (!fees) return
        return fromBaseUnit(fees.networkFeeCryptoBaseUnit, feeAsset.precision)
      } catch (error) {
        // TODO: handle client side errors maybe add a toast?
        console.error(error)
      }
    },
    [feeAsset.precision, getUnstakeFees, isExiting],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!opportunity || !dispatch || !underlyingAsset) return
      // set withdraw state for future use
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
      dispatch({
        type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
        payload: {
          lpAmount: formValues.cryptoAmount,
          isExiting,
          fiatAmount: formValues.fiatAmount,
        },
      })
      const lpAllowance = await allowance()
      const allowanceAmount = bn(fromBaseUnit(bnOrZero(lpAllowance), underlyingAsset.precision))

      // Skip approval step if user allowance is greater than or equal requested deposit amount
      if (allowanceAmount.gte(bnOrZero(formValues.cryptoAmount))) {
        const estimatedGasCryptoPrecision = await getWithdrawGasEstimateCryptoPrecision(formValues)
        if (!estimatedGasCryptoPrecision) {
          dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
          return
        }
        dispatch({
          type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCryptoPrecision },
        })
        onNext(DefiStep.Confirm)
        dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
        trackOpportunityEvent(
          MixPanelEvents.WithdrawContinue,
          {
            opportunity,
            fiatAmounts: [formValues.fiatAmount],
            cryptoAmounts: [
              { assetId: underlyingAsset.assetId, amountCryptoHuman: formValues.cryptoAmount },
            ],
          },
          assets,
        )
      } else {
        const fees = await getApproveFees()
        if (!fees) return
        dispatch({
          type: FoxFarmingWithdrawActionType.SET_APPROVE,
          payload: {
            estimatedGasCryptoPrecision: fromBaseUnit(
              fees.networkFeeCryptoBaseUnit,
              feeAsset.precision,
            ),
          },
        })
        onNext(DefiStep.Approve)
        dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [
      allowance,
      assets,
      dispatch,
      feeAsset.precision,
      getApproveFees,
      getWithdrawGasEstimateCryptoPrecision,
      isExiting,
      onNext,
      opportunity,
      underlyingAsset,
    ],
  )

  const handleCancel = browserHistory.goBack

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(amountAvailableCryptoPrecision).times(percent).toString()
      const fiatAmount = bnOrZero(opportunity?.fiatAmount)
        .times(percent)
        .toString()
      setValue(Field.FiatAmount, fiatAmount, { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount, { shouldValidate: true })
      // exit if max button was clicked
      setIsExiting(percent === 1)
    },
    [amountAvailableCryptoPrecision, opportunity?.fiatAmount, setValue],
  )

  const handleInputChange = useCallback(
    (value: string, isFiat?: boolean) => {
      const percentage = bnOrZero(value).div(
        bnOrZero(isFiat ? opportunity?.fiatAmount : amountAvailableCryptoPrecision),
      )
      // exit if withdrawing total balance
      setIsExiting(percentage.eq(1))
    },
    [amountAvailableCryptoPrecision, opportunity?.fiatAmount],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bn(amountAvailableCryptoPrecision)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(_value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [amountAvailableCryptoPrecision],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const _value = bnOrZero(value)
      const fiat = bnOrZero(opportunity?.fiatAmount)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(_value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [opportunity?.fiatAmount],
  )

  if (!underlyingAsset || !state || !dispatch || !opportunity) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={underlyingAsset}
        icons={opportunity?.icons}
        cryptoAmountAvailable={amountAvailableCryptoPrecision}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={opportunity?.fiatAmount?.toString() ?? '0'}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={marketData}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !opportunity?.fiatAmount}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      />
    </FormProvider>
  )
}
