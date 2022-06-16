import { toAssetId } from '@shapeshiftoss/caip'
import {
  Withdraw as ReusableWithdraw,
  WithdrawValues,
} from 'features/defi/components/Withdraw/Withdraw'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { WithdrawPath, YearnWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export const Withdraw = () => {
  const { state, dispatch } = useContext(WithdrawContext)
  const history = useHistory()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { yearn: yearnInvestor } = useYearn()
  const { chainId, contractAddress: vaultAddress, assetReference } = query
  const opportunity = state?.opportunity

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
  const marketData = useAppSelector(state => selectMarketDataById(state, underlyingAssetId))

  // user info
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, { assetId }))

  if (!state || !dispatch) return null

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
      return bnOrZero(preparedTx.gasPrice).times(preparedTx.estimatedGas).integerValue().toString()
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error('YearnWithdraw:getWithdrawGasEstimate error:', error)
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!(state.userAddress && opportunity)) return
    // set withdraw state for future use
    dispatch({ type: YearnWithdrawActionType.SET_WITHDRAW, payload: formValues })

    const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
    if (!estimatedGasCrypto) return
    dispatch({
      type: YearnWithdrawActionType.SET_WITHDRAW,
      payload: { estimatedGasCrypto },
    })
    history.push(WithdrawPath.Confirm)
  }

  const handleCancel = () => {
    browserHistory.goBack()
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
    const fiat = crypto.times(marketData.price)
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e+${asset?.precision}`)
  const pricePerShare = bnOrZero(state.opportunity?.positionAsset.underlyingPerPosition).div(
    `1e+${asset?.precision}`,
  )
  const vaultTokenPrice = pricePerShare.times(marketData.price)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(vaultTokenPrice)

  return (
    <ReusableWithdraw
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
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
    />
  )
}
