import { ethAssetId } from '@shapeshiftoss/caip'
import {
  Field,
  Withdraw as ReusableWithdraw,
  WithdrawValues,
} from 'features/defi/components/Withdraw/Withdraw'
import {
  DefiParams,
  DefiQueryParams,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useContext } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export const Withdraw: React.FC<StepComponentProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const { history: browserHistory, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress } = query
  const opportunity = state?.opportunity
  const { getUnstakeGasData, allowance, getApproveGasData } = useFoxFarming(contractAddress)

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const asset = useAppSelector(state => selectAssetById(state, opportunity?.assetId ?? ''))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  // user info
  const cryptoAmountAvailable = bnOrZero(opportunity?.cryptoAmount)
  const totalFiatBalance = opportunity?.fiatAmount

  if (!state || !dispatch) return null

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    try {
      const fee = await getUnstakeGasData(withdraw.cryptoAmount)
      if (!fee) return
      return bnOrZero(fee.average.txFee).div(`1e${ethAsset.precision}`).toPrecision()
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error('FoxFarmingWithdraw:getWithdrawGasEstimate error:', error)
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!opportunity) return
    // set withdraw state for future use
    dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
    dispatch({
      type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
      payload: { lpAmount: formValues.cryptoAmount },
    })
    const lpAllowance = await allowance()
    const allowanceAmount = bnOrZero(lpAllowance).div(`1e+${asset.precision}`)

    // Skip approval step if user allowance is greater than requested deposit amount
    if (allowanceAmount.gt(bnOrZero(formValues.cryptoAmount))) {
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
            .div(`1e${ethAsset.precision}`)
            .toPrecision(),
        },
      })
      onNext(DefiStep.Approve)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const handlePercentClick = (percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
    const fiatAmount = bnOrZero(totalFiatBalance).times(percent).toFixed(2)
    setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(cryptoAmountAvailable)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const fiat = bnOrZero(totalFiatBalance)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        asset={asset}
        icons={opportunity?.icons}
        cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={totalFiatBalance ?? '0'}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={{
          // The LP token doesnt have market data.
          // We're making our own market data object for the withdraw view
          price: bnOrZero(totalFiatBalance).div(cryptoAmountAvailable).toFixed(2),
          marketCap: '0',
          volume: '0',
          changePercent24Hr: 0,
        }}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !totalFiatBalance}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
      />
    </FormProvider>
  )
}
