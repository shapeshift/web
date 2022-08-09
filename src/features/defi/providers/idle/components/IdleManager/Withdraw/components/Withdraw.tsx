import { toAssetId } from '@shapeshiftoss/caip'
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
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { useContext } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export const Withdraw: React.FC<StepComponentProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { idle: idleInvestor } = useIdle()
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

  if (!state || !dispatch) return null

  const pricePerShare = bnOrZero(state.opportunity?.positionAsset.underlyingPerPosition).div(
    `1e+${asset?.precision}`,
  )
  const vaultTokenPrice = pricePerShare.times(marketData.price)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(vaultTokenPrice)

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    if (!(state.userAddress && opportunity && assetReference)) return
    try {
      const idleOpportunity = await idleInvestor?.findByOpportunityId(
        opportunity?.positionAsset.assetId,
      )
      if (!idleOpportunity) throw new Error('No opportunity')
      const preparedTx = await idleOpportunity.prepareWithdrawal({
        amount: bnOrZero(withdraw.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
        address: state.userAddress,
      })
      return bnOrZero(preparedTx.gasPrice).times(preparedTx.estimatedGas).integerValue().toString()
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error('IdleWithdraw:getWithdrawGasEstimate error:', error)
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!(state.userAddress && opportunity)) return
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
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const handlePercentClick = (percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
    const fiatAmount = bnOrZero(cryptoAmount).times(vaultTokenPrice)
    setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const fiat = crypto.times(vaultTokenPrice)
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

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
