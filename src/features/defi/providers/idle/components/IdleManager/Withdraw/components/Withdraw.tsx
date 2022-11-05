import { toAssetId } from '@keepkey/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Idle', 'IdleWithdraw'],
})

export const Withdraw: React.FC<StepComponentProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { idleInvestor } = useIdle()
  const { chainId, contractAddress: vaultAddress, assetReference } = query
  const opportunity = state?.opportunity

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const assetNamespace = 'erc20'
  // Asset info
  const underlyingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, underlyingAssetId))

  // user info
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, { assetId }))
  const cryptoAmountAvailable = bnOrZero(balance).div(`1e+${asset?.precision}`)

  const pricePerShare = useMemo(() => {
    if (!state?.opportunity) return bnOrZero(0)
    return bnOrZero(state.opportunity?.positionAsset.underlyingPerPosition).div(
      `1e+${asset?.precision}`,
    )
  }, [state?.opportunity, asset])

  const vaultTokenPrice = pricePerShare.times(marketData.price).toString()
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(vaultTokenPrice)

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      if (!(state?.userAddress && opportunity && assetReference)) return
      try {
        const idleOpportunity = await idleInvestor?.findByOpportunityId(
          opportunity?.positionAsset.assetId,
        )
        if (!idleOpportunity) throw new Error('No opportunity')
        const preparedTx = await idleOpportunity.prepareWithdrawal({
          amount: bnOrZero(withdraw.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
          address: state.userAddress,
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
    [state?.userAddress, opportunity, assetReference, idleInvestor, asset],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(state?.userAddress && opportunity && dispatch)) return
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
    [state?.userAddress, getWithdrawGasEstimate, onNext, opportunity, dispatch],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
      const fiatAmount = bnOrZero(cryptoAmount).times(vaultTokenPrice)
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    },
    [cryptoAmountAvailable, vaultTokenPrice, setValue],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance, asset],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const fiat = crypto.times(vaultTokenPrice)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [balance, asset, vaultTokenPrice],
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
          price: vaultTokenPrice,
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
