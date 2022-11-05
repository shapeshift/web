import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { fromAccountId, toAssetId } from '@keepkey/caip'
import { WithdrawType } from '@keepkey/types'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FoxyWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
import { WithdrawTypeField } from './WithdrawType'

export type FoxyWithdrawValues = {
  [Field.WithdrawType]: WithdrawType
} & WithdrawValues

const moduleLogger = logger.child({ namespace: ['FoxyWithdraw:Withdraw'] })

export const Withdraw: React.FC<
  StepComponentProps & {
    accountId: Nullable<AccountId>
    onAccountIdChange: AccountDropdownProps['onChange']
  }
> = ({ accountId, onAccountIdChange: handleAccountIdChange, onNext }) => {
  const { foxy: api } = useFoxy()
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, rewardId, assetReference } = query
  const toast = useToast()

  const methods = useForm<FoxyWithdrawValues>({ mode: 'onChange' })
  const { setValue, watch } = methods

  const withdrawTypeValue = watch(Field.WithdrawType)

  const assetNamespace = 'erc20'
  // Reward Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // Staking Asset Info
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  // user info

  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))

  const cryptoAmountAvailable = bnOrZero(bn(balance).div(bn(10).pow(asset?.precision)))
  const fiatAmountAvailable = bnOrZero(bn(cryptoAmountAvailable).times(bnOrZero(marketData?.price)))

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(cryptoAmountAvailable)
        .times(percent)
        .dp(asset.precision, BigNumber.ROUND_DOWN)
      const fiatAmount = bnOrZero(cryptoAmount).times(marketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), {
        shouldValidate: true,
      })
    },
    [asset.precision, cryptoAmountAvailable, marketData.price, setValue],
  )

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const handleContinue = useCallback(
    async (formValues: FoxyWithdrawValues) => {
      if (!(accountAddress && dispatch && rewardId && api && bip44Params)) return

      const getApproveGasEstimate = async () => {
        if (!accountAddress) return

        try {
          const [gasLimit, gasPrice] = await Promise.all([
            api.estimateApproveGas({
              tokenContractAddress: rewardId,
              contractAddress,
              userAddress: accountAddress,
            }),
            api.getGasPrice(),
          ])
          return bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
        } catch (error) {
          moduleLogger.error(error, { fn: 'getApproveEstimate' }, 'getApproveEstimate error')
          toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
      }

      const getWithdrawGasEstimate = async (withdraw: FoxyWithdrawValues) => {
        if (!accountAddress) return

        try {
          const [gasLimit, gasPrice] = await Promise.all([
            api.estimateWithdrawGas({
              tokenContractAddress: rewardId,
              contractAddress,
              amountDesired: bnOrZero(
                bn(withdraw.cryptoAmount).times(`1e+${asset.precision}`),
              ).decimalPlaces(0),
              userAddress: accountAddress,
              type: withdraw.withdrawType,
              bip44Params,
            }),
            api.getGasPrice(),
          ])
          return bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
        } catch (error) {
          moduleLogger.error(
            { fn: 'getWithdrawGasEstimate', error },
            'Error getting deposit gas estimate',
          )
          const fundsError =
            error instanceof Error && error.message.includes('Not enough funds in reserve')
          toast({
            position: 'top-right',
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
        const _allowance = await api.allowance({
          tokenContractAddress: rewardId,
          contractAddress,
          userAddress: accountAddress,
        })

        const allowance = bnOrZero(bn(_allowance).div(bn(10).pow(asset.precision)))

        // Skip approval step if user allowance is greater than or equal requested deposit amount
        if (allowance.gte(formValues.cryptoAmount)) {
          const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
          if (!estimatedGasCrypto) return
          dispatch({
            type: FoxyWithdrawActionType.SET_WITHDRAW,
            payload: { estimatedGasCrypto },
          })
          onNext(DefiStep.Confirm)
          dispatch({
            type: FoxyWithdrawActionType.SET_LOADING,
            payload: false,
          })
        } else {
          const estimatedGasCrypto = await getApproveGasEstimate()
          if (!estimatedGasCrypto) return
          dispatch({
            type: FoxyWithdrawActionType.SET_APPROVE,
            payload: { estimatedGasCrypto },
          })
          onNext(DefiStep.Approve)
          dispatch({
            type: FoxyWithdrawActionType.SET_LOADING,
            payload: false,
          })
        }
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error with withdraw')
        dispatch({
          type: FoxyWithdrawActionType.SET_LOADING,
          payload: false,
        })
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [
      api,
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

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(bn(balance).div(bn(10).pow(asset.precision)))
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(bn(balance).div(bn(10).pow(asset.precision)))
    const fiat = crypto.times(bnOrZero(marketData?.price))
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  if (!state || !dispatch) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
        asset={asset}
        cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={fiatAmountAvailable.toString()}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={marketData}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        handlePercentClick={handlePercentClick}
        disableInput={withdrawTypeValue === WithdrawType.INSTANT}
        percentOptions={[0.25, 0.5, 0.75, 1]}
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
