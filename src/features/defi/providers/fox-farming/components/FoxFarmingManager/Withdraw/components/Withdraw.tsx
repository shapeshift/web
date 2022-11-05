import type { AccountId } from '@keepkey/caip'
import { ethAssetId } from '@keepkey/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useContext, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
const moduleLogger = logger.child({ namespace: ['Withdraw'] })

type WithdrawProps = StepComponentProps & {
  accountId?: Nullable<AccountId>
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

  const asset = useAppSelector(state => selectAssetById(state, opportunity?.assetId ?? ''))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  // user info
  const cryptoAmountAvailable = bnOrZero(opportunity?.cryptoAmount)
  const totalFiatBalance = opportunity?.fiatAmount

  if (!state || !dispatch || !opportunity) return null

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    try {
      const fee = await getUnstakeGasData(withdraw.cryptoAmount, isExiting)
      if (!fee) return
      return bnOrZero(fee.average.txFee).div(bn(10).pow(ethAsset.precision)).toPrecision()
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      moduleLogger.error(error, 'FoxFarmingWithdraw:getWithdrawGasEstimate error:')
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!opportunity) return
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
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const handlePercentClick = (percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
    const fiatAmount = bnOrZero(totalFiatBalance).times(percent).toFixed(2)
    setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    // exit if max button was clicked
    if (percent === 1) setIsExiting(true)
    else setIsExiting(false)
  }

  const handleInputChange = (value: string, isFiat?: boolean) => {
    const percentage = bnOrZero(value).div(
      bnOrZero(isFiat ? totalFiatBalance : cryptoAmountAvailable),
    )
    // exit if widhtrawing total balance
    if (percentage.eq(1)) setIsExiting(true)
    else setIsExiting(false)
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
        accountId={accountId}
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
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !totalFiatBalance}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      />
    </FormProvider>
  )
}
