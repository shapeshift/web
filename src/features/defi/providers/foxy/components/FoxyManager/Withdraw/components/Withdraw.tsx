import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { WithdrawType } from '@shapeshiftoss/types'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import {
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
import { WithdrawTypeField } from './WithdrawType'

export type FoxyWithdrawValues = {
  [Field.WithdrawType]: WithdrawType
} & WithdrawValues

const moduleLogger = logger.child({ namespace: ['FoxyWithdraw:Withdraw'] })

export const Withdraw: React.FC<
  StepComponentProps & {
    accountId: AccountId | undefined
    onAccountIdChange: AccountDropdownProps['onChange']
  }
> = ({ accountId, onAccountIdChange: handleAccountIdChange, onNext }) => {
  const foxyApi = getFoxyApi()
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const {
    contractAddress,
    underlyingAssetId: assetId,
    underlyingAsset: asset,
    rewardId,
    stakingAsset,
  } = useFoxyQuery()

  const toast = useToast()

  const methods = useForm<FoxyWithdrawValues>({ mode: 'onChange' })
  const { setValue, watch } = methods

  const withdrawTypeValue = watch(Field.WithdrawType)

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, filter),
  )

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
      if (!(accountAddress && dispatch && rewardId && foxyApi && bip44Params)) return

      const getWithdrawGasEstimateCryptoBaseUnit = async (withdraw: FoxyWithdrawValues) => {
        if (!accountAddress) return

        try {
          const [gasLimit, gasPrice] = await Promise.all([
            foxyApi.estimateWithdrawGas({
              tokenContractAddress: rewardId,
              contractAddress,
              amountDesired: bnOrZero(
                bn(withdraw.cryptoAmount).times(bn(10).pow(asset.precision)),
              ).decimalPlaces(0),
              userAddress: accountAddress,
              type: withdraw.withdrawType,
              bip44Params,
            }),
            foxyApi.getGasPrice(),
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
