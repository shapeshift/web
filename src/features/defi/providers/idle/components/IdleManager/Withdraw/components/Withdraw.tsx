import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { IdleOpportunity } from 'lib/investor/investor-idle'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { getIdleInvestor } from 'state/slices/opportunitiesSlice/resolvers/idle/idleInvestorSingleton'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type WithdrawProps = StepComponentProps & { accountId: AccountId | undefined }

export const Withdraw: React.FC<WithdrawProps> = ({ accountId, onNext }) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const [idleOpportunity, setIdleOpportunity] = useState<IdleOpportunity>()
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const assets = useAppSelector(selectAssets)

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
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  useEffect(() => {
    if (!opportunityData?.assetId) return
    ;(async () => {
      setIdleOpportunity(await idleInvestor.findByOpportunityId(opportunityData.assetId))
    })()
  }, [idleInvestor, opportunityData?.assetId, setIdleOpportunity])

  const assetMarketData = useAppSelector(state =>
    selectMarketDataById(state, opportunityData?.assetId ?? ''),
  )

  const asset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, opportunityData?.assetId ?? ''),
  )
  if (!asset) throw new Error(`Asset not found for AssetId ${opportunityData?.assetId}`)

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  // user info
  const amountAvailableCryptoPrecision = useMemo(() => {
    return bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit).div(bn(10).pow(asset.precision))
  }, [asset.precision, opportunityData?.stakedAmountCryptoBaseUnit])

  const fiatAmountAvailable = useMemo(
    () => bnOrZero(amountAvailableCryptoPrecision).times(assetMarketData.price),
    [amountAvailableCryptoPrecision, assetMarketData],
  )

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      if (!(userAddress && opportunityData && assetReference)) return
      try {
        if (!idleOpportunity) throw new Error('No opportunity')
        const preparedTx = await idleOpportunity.prepareWithdrawal({
          amount: bnOrZero(withdraw.cryptoAmount)
            .times(bn(10).pow(asset?.precision))
            .integerValue(),
          address: userAddress,
        })
        return bnOrZero(preparedTx.gasPrice)
          .times(preparedTx.estimatedGas)
          .integerValue()
          .toString()
      } catch (error) {
        // TODO: handle client side errors maybe add a toast?
        console.error(error)
      }
    },
    [userAddress, opportunityData, assetReference, idleOpportunity, asset?.precision],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(userAddress && dispatch && opportunityData)) return
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
      trackOpportunityEvent(
        MixPanelEvents.WithdrawContinue,
        {
          opportunity: opportunityData,
          fiatAmounts: [formValues.fiatAmount],
          cryptoAmounts: [{ assetId: asset.assetId, amountCryptoHuman: formValues.cryptoAmount }],
        },
        assets,
      )
    },
    [userAddress, dispatch, getWithdrawGasEstimate, onNext, opportunityData, asset.assetId, assets],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(amountAvailableCryptoPrecision).times(percent)
      const fiatAmount = bnOrZero(cryptoAmount).times(assetMarketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toFixed(), { shouldValidate: true })
    },
    [amountAvailableCryptoPrecision, assetMarketData, setValue],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(amountAvailableCryptoPrecision.toPrecision())
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [amountAvailableCryptoPrecision],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(amountAvailableCryptoPrecision.toPrecision())
      const fiat = crypto.times(assetMarketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [amountAvailableCryptoPrecision, assetMarketData],
  )

  if (!state) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        asset={asset}
        cryptoAmountAvailable={amountAvailableCryptoPrecision.toPrecision()}
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
          price: assetMarketData.price,
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
