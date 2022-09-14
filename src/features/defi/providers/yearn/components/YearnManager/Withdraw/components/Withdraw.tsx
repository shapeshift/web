import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { YearnWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Yearn', 'Withdraw', 'Withdraw'],
})

export const Withdraw: React.FC<
  StepComponentProps & {
    accountId: Nullable<AccountId>
    onAccountIdChange: AccountDropdownProps['onChange']
  }
> = ({ accountId, onAccountIdChange: handleAccountIdChange, onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { yearn: yearnInvestor } = useYearn()
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
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))
  const cryptoAmountAvailable = bnOrZero(balance).div(`1e+${asset?.precision}`)

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
      const fiatAmount = bnOrZero(cryptoAmount).times(marketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    },
    [cryptoAmountAvailable, marketData.price, setValue],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(state?.userAddress && opportunity && dispatch)) return

      const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
        if (!(state.userAddress && opportunity && assetReference)) return
        try {
          const yearnOpportunity = await yearnInvestor?.findByOpportunityId(
            opportunity?.positionAsset.assetId,
          )
          if (!yearnOpportunity) throw new Error('No opportunity')
          const preparedTx = await yearnOpportunity.prepareWithdrawal({
            amount: bnOrZero(withdraw.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
            address: state.userAddress,
          })
          return bnOrZero(preparedTx.gasPrice)
            .times(preparedTx.estimatedGas)
            .integerValue()
            .toString()
        } catch (error) {
          // TODO: handle client side errors maybe add a toast?
          moduleLogger.error(error, { fn: 'getWithdrawGasEstimate' }, 'YearnWithdraw error:')
        }
      }

      // set withdraw state for future use
      dispatch({ type: YearnWithdrawActionType.SET_WITHDRAW, payload: formValues })
      dispatch({ type: YearnWithdrawActionType.SET_LOADING, payload: true })
      const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
      if (!estimatedGasCrypto) return
      dispatch({
        type: YearnWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: YearnWithdrawActionType.SET_LOADING, payload: false })
    },
    [
      dispatch,
      asset.precision,
      assetReference,
      onNext,
      opportunity,
      state?.userAddress,
      yearnInvestor,
    ],
  )

  if (!state || !dispatch) return null

  const handleCancel = browserHistory.goBack

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const fiat = crypto.times(marketData.price)
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const pricePerShare = bnOrZero(state.opportunity?.positionAsset.underlyingPerPosition).div(
    `1e+${asset?.precision}`,
  )
  const vaultTokenPrice = pricePerShare.times(marketData.price)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(vaultTokenPrice)

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
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
          price: vaultTokenPrice.toString(),
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
