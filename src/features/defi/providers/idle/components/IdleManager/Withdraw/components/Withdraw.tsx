import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunity,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Idle', 'IdleWithdraw'],
})

type WithdrawProps = StepComponentProps & { accountId: AccountId | undefined }

export const Withdraw: React.FC<WithdrawProps> = ({ accountId, onNext }) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  // Asset info

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [chainId, contractAddress],
  )

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunity(state, opportunityDataFilter),
  )

  const underlyingAssetId = useMemo(
    () => opportunityData?.underlyingAssetIds[0] ?? '',
    [opportunityData?.underlyingAssetIds],
  )

  const assetId = useMemo(() => opportunityData?.assetId ?? '', [opportunityData?.assetId])

  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  // user info
  const cryptoAmountAvailable = bnOrZero(opportunityData?.stakedAmountCryptoPrecision)

  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(assetMarketData.price)

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      if (!(userAddress && opportunityData && assetReference)) return
      try {
        const idleOpportunity = await idleInvestor.findByOpportunityId(opportunityData?.assetId)
        if (!idleOpportunity) throw new Error('No opportunity')
        const preparedTx = await idleOpportunity.prepareWithdrawal({
          amount: bnOrZero(withdraw.cryptoAmount)
            .times(bn(10).pow(underlyingAsset?.precision))
            .integerValue(),
          address: userAddress,
        })
        return bnOrZero(preparedTx.gasPrice)
          .times(preparedTx.estimatedGas)
          .integerValue()
          .toString()
      } catch (error) {
        // TODO: handle client side errors maybe add a toast?
        moduleLogger.error(error, 'IdleWithdraw:Withdraw:getWithdrawGasEstimate error')
      }
    },
    [userAddress, opportunityData, assetReference, idleInvestor, underlyingAsset.precision],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(userAddress && dispatch)) return
      // set withdraw state for future use
      dispatch({ type: IdleWithdrawActionType.SET_WITHDRAW, payload: formValues })
      dispatch({ type: IdleWithdrawActionType.SET_LOADING, payload: true })
      const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
      if (!estimatedGasCrypto) return
      dispatch({
        type: IdleWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: IdleWithdrawActionType.SET_LOADING, payload: false })
    },
    [userAddress, getWithdrawGasEstimate, onNext, dispatch],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
      const fiatAmount = bnOrZero(cryptoAmount).times(assetMarketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    },
    [cryptoAmountAvailable, assetMarketData.price, setValue],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(opportunityData?.stakedAmountCryptoPrecision)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [opportunityData?.stakedAmountCryptoPrecision],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(opportunityData?.stakedAmountCryptoPrecision)
      const fiat = crypto.times(assetMarketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [assetMarketData.price, opportunityData?.stakedAmountCryptoPrecision],
  )

  if (!state) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        asset={underlyingAsset}
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
        marketData={{
          // The vault asset doesnt have market data.
          // We're making our own market data object for the withdraw view
          price: assetMarketData?.price,
          marketCap: '0',
          volume: '0',
          changePercent24Hr: 0,
        }}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
      />
    </FormProvider>
  )
}
