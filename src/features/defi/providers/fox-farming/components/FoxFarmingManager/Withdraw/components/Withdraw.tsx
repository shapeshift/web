import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useCallback, useContext, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({ namespace: ['Withdraw'] })

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
  const { contractAddress } = query
  const opportunity = state?.opportunity
  const { getUnstakeGasData, allowance, getApproveGasData } = useFoxFarming(contractAddress)

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const asset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const marketData = useAppSelector(state =>
    selectMarketDataById(state, opportunity?.underlyingAssetId ?? ''),
  )

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      try {
        const fee = await getUnstakeGasData(withdraw.cryptoAmount, isExiting)
        if (!fee) return
        return bnOrZero(fee.average.txFee).div(bn(10).pow(ethAsset.precision)).toPrecision()
      } catch (error) {
        // TODO: handle client side errors maybe add a toast?
        moduleLogger.error(error, 'FoxFarmingWithdraw:getWithdrawGasEstimate error:')
      }
    },
    [ethAsset.precision, getUnstakeGasData, isExiting],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!opportunity || !dispatch || !asset) return
      // set withdraw state for future use
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
      dispatch({
        type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
        payload: { lpAmount: formValues.cryptoAmount, isExiting },
      })
      const lpAllowance = await allowance()
      const allowanceAmount = bnOrZero(lpAllowance).div(bn(10).pow(asset.precision))

      // Skip approval step if user allowance is greater than or equal requested deposit amount
      if (allowanceAmount.gte(bnOrZero(formValues.cryptoAmount))) {
        const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
        if (!estimatedGasCrypto) {
          dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
          return
        }
        dispatch({
          type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiStep.Confirm)
        dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
      } else {
        const estimatedGasCrypto = await getApproveGasData()
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxFarmingWithdrawActionType.SET_APPROVE,
          payload: {
            estimatedGasCrypto: bnOrZero(estimatedGasCrypto.average.txFee)
              .div(bn(10).pow(ethAsset.precision))
              .toPrecision(),
          },
        })
        onNext(DefiStep.Approve)
        dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [
      allowance,
      asset,
      dispatch,
      ethAsset.precision,
      getApproveGasData,
      getWithdrawGasEstimate,
      isExiting,
      onNext,
      opportunity,
    ],
  )

  const handleCancel = browserHistory.goBack

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(opportunity?.cryptoAmountBaseUnit).times(percent)
      const fiatAmount = bnOrZero(opportunity?.fiatAmount).times(percent).toString()
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
      // exit if max button was clicked
      setIsExiting(percent === 1)
    },
    [opportunity?.cryptoAmountBaseUnit, opportunity?.fiatAmount, setValue],
  )

  const handleInputChange = useCallback(
    (value: string, isFiat?: boolean) => {
      const percentage = bnOrZero(value).div(
        bnOrZero(isFiat ? opportunity?.fiatAmount : opportunity?.cryptoAmountBaseUnit),
      )
      // exit if withdrawing total balance
      setIsExiting(percentage.eq(1))
    },
    [opportunity?.cryptoAmountBaseUnit, opportunity?.fiatAmount],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(opportunity?.cryptoAmountBaseUnit)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(_value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [opportunity?.cryptoAmountBaseUnit],
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

  if (!asset || !state || !dispatch || !opportunity) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={asset}
        icons={opportunity?.icons}
        cryptoAmountAvailable={opportunity?.cryptoAmountBaseUnit}
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
