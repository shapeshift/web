import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { WithdrawType } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { FoxyWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
import { WithdrawTypeField } from './WithdrawType'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from '@/components/DeFi/components/Steps'
import type { WithdrawValues } from '@/features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from '@/features/defi/components/Withdraw/Withdraw'
import { DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from '@/features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { BigNumber, bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'
import { getFoxyApi } from '@/state/apis/foxy/foxyApiSingleton'
import {
  selectBip44ParamsByAccountId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type FoxyWithdrawValues = {
  [Field.WithdrawType]: WithdrawType
} & WithdrawValues

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Withdraw: React.FC<
  StepComponentProps & {
    accountId: AccountId | undefined
    onAccountIdChange: AccountDropdownProps['onChange']
  }
> = ({ accountId, onAccountIdChange: handleAccountIdChange, onNext }) => {
  const foxyApi = getFoxyApi()
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const navigate = useNavigate()

  const {
    contractAddress,
    underlyingAssetId: assetId,
    underlyingAsset: asset,
    rewardId,
    stakingAsset,
  } = useFoxyQuery()

  const toast = useNotificationToast({ desktopPosition: 'top-right' })

  const methods = useForm<FoxyWithdrawValues>({ mode: 'onChange' })
  const { setValue, watch } = methods

  const withdrawTypeValue = watch(Field.WithdrawType)

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  // user info
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))

  const cryptoAmountAvailable = balance
  const fiatAmountAvailable = cryptoAmountAvailable.times(marketData?.price)

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bn(cryptoAmountAvailable.toPrecision())
        .times(percent)
        .dp(asset.precision, BigNumber.ROUND_DOWN)
      const fiatAmount = bnOrZero(cryptoAmount).times(bnOrZero(marketData?.price))
      setValue(Field.FiatAmount, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), {
        shouldValidate: true,
      })
    },
    [asset.precision, cryptoAmountAvailable, marketData?.price, setValue],
  )

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBip44ParamsByAccountId(state, accountFilter))

  const handleContinue = useCallback(
    async (formValues: FoxyWithdrawValues) => {
      if (!(accountAddress && dispatch && rewardId && foxyApi && bip44Params)) return

      const getApproveGasEstimateCryptoBaseUnit = async () => {
        if (!accountAddress) return

        try {
          const feeDataEstimate = await foxyApi.estimateApproveFees({
            tokenContractAddress: rewardId,
            contractAddress,
            userAddress: accountAddress,
          })

          const {
            chainSpecific: { gasPrice, gasLimit },
          } = feeDataEstimate.fast

          return bn(gasPrice).times(gasLimit).toFixed(0)
        } catch (error) {
          console.error(error)
          toast({
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
      }

      const getWithdrawGasEstimateCryptoBaseUnit = async (withdraw: FoxyWithdrawValues) => {
        if (!accountAddress) return

        try {
          const feeDataEstimate = await foxyApi.estimateWithdrawFees({
            tokenContractAddress: rewardId,
            contractAddress,
            amountDesired: bnOrZero(toBaseUnit(withdraw.cryptoAmount ?? '0', asset.precision)),
            userAddress: accountAddress,
            type: withdraw.withdrawType,
            bip44Params,
          })

          const {
            chainSpecific: { gasPrice, gasLimit },
          } = feeDataEstimate.fast

          return bn(gasPrice).times(gasLimit).toFixed(0)
        } catch (error) {
          console.error(error)
          const fundsError =
            error instanceof Error && error.message.includes('Not enough funds in reserve')
          toast({
            description: fundsError
              ? translate('defi.notEnoughFundsInReserve')
              : translate('common.somethingWentWrong'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
      }

      // set withdraw state for future use
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
        payload: formValues,
      })
      dispatch({
        type: FoxyWithdrawActionType.SET_LOADING,
        payload: true,
      })
      try {
        // Check is approval is required for user address
        const _allowance = await foxyApi.allowance({
          tokenContractAddress: rewardId,
          contractAddress,
          userAddress: accountAddress,
        })

        const allowance = BigAmount.fromBaseUnit({
          value: _allowance ?? '0',
          precision: asset.precision,
        })

        // Skip approval step if user allowance is greater than or equal requested withdraw amount
        if (allowance.gte(formValues.cryptoAmount)) {
          const estimatedGasCryptoBaseUnit = await getWithdrawGasEstimateCryptoBaseUnit(formValues)
          if (!estimatedGasCryptoBaseUnit) return
          dispatch({
            type: FoxyWithdrawActionType.SET_WITHDRAW,
            payload: { estimatedGasCryptoBaseUnit },
          })
          onNext(DefiStep.Confirm)
          dispatch({
            type: FoxyWithdrawActionType.SET_LOADING,
            payload: false,
          })
        } else {
          const estimatedGasCryptoBaseUnit = await getApproveGasEstimateCryptoBaseUnit()
          if (!estimatedGasCryptoBaseUnit) return
          dispatch({
            type: FoxyWithdrawActionType.SET_APPROVE,
            payload: { estimatedGasCryptoBaseUnit },
          })
          onNext(DefiStep.Approve)
          dispatch({
            type: FoxyWithdrawActionType.SET_LOADING,
            payload: false,
          })
        }
      } catch (error) {
        console.error(error)
        dispatch({
          type: FoxyWithdrawActionType.SET_LOADING,
          payload: false,
        })
        toast({
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [
      foxyApi,
      asset.precision,
      bip44Params,
      contractAddress,
      dispatch,
      onNext,
      rewardId,
      accountAddress,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => navigate(-1), [navigate])

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const _value = bnOrZero(value)
      const hasValidBalance = balance.gt(0) && _value.gt(0) && balance.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const fiat = balance.times(marketData?.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance, marketData?.price],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount },
    }),
    [validateFiatAmount],
  )

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount },
    }),
    [validateCryptoAmount],
  )

  if (!state || !dispatch) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
        asset={asset}
        cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
        cryptoInputValidation={cryptoInputValidation}
        fiatAmountAvailable={fiatAmountAvailable.toPrecision()}
        fiatInputValidation={fiatInputValidation}
        marketData={marketData}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        handlePercentClick={handlePercentClick}
        disableInput={withdrawTypeValue === WithdrawType.INSTANT}
        percentOptions={percentOptions}
      >
        <WithdrawTypeField
          asset={stakingAsset}
          handlePercentClick={handlePercentClick}
          feePercentage={bnOrZero(state.foxyFeePercentage).toString()}
        />
      </ReusableWithdraw>
    </FormProvider>
  )
}
