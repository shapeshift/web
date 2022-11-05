import type { AccountId } from '@keepkey/caip'
import { fromAccountId, toAssetId } from '@keepkey/caip'
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

type WithdrawProps = StepComponentProps & {
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const {
    query,
    history: { goBack: handleCancel },
  } = useBrowserRouter<DefiQueryParams, DefiParams>()
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

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
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
      if (!(accountAddress && opportunity && dispatch)) return

      const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
        if (!(accountAddress && opportunity && assetReference)) return
        try {
          const yearnOpportunity = await yearnInvestor?.findByOpportunityId(
            opportunity?.positionAsset.assetId,
          )
          if (!yearnOpportunity) throw new Error('No opportunity')
          const preparedTx = await yearnOpportunity.prepareWithdrawal({
            amount: bnOrZero(withdraw.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
            address: accountAddress,
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
    [accountAddress, dispatch, asset.precision, assetReference, onNext, opportunity, yearnInvestor],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, balance],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const fiat = crypto.times(marketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, balance, marketData.price],
  )

  const pricePerShare = useMemo(
    () =>
      bnOrZero(state?.opportunity?.positionAsset.underlyingPerPosition).div(
        `1e+${asset?.precision}`,
      ),
    [state, asset],
  )

  const vaultTokenPrice = useMemo(
    () => pricePerShare.times(marketData.price),
    [pricePerShare, marketData],
  )
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(vaultTokenPrice)

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount },
    }),
    [validateCryptoAmount],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount },
    }),
    [validateFiatAmount],
  )

  const withdrawMarketData = useMemo(
    () => ({
      // The vault asset doesnt have market data.
      // We're making our own market data object for the withdraw view
      price: vaultTokenPrice.toString(),
      marketCap: '0',
      volume: '0',
      changePercent24Hr: 0,
    }),
    [vaultTokenPrice],
  )

  const percentOptions = useMemo(() => [0.25, 0.5, 0.75, 1], [])

  if (!state) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
        asset={underlyingAsset}
        cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
        cryptoInputValidation={cryptoInputValidation}
        fiatAmountAvailable={fiatAmountAvailable.toString()}
        fiatInputValidation={fiatInputValidation}
        marketData={withdrawMarketData}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        percentOptions={percentOptions}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
      />
    </FormProvider>
  )
}
