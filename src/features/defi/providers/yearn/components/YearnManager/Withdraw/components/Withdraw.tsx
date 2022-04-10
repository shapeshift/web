import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { YearnVaultApi } from '@shapeshiftoss/investor-yearn'
import { NetworkTypes } from '@shapeshiftoss/types'
import {
  Withdraw as ReusableWithdraw,
  WithdrawValues,
} from 'features/defi/components/Withdraw/Withdraw'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { WithdrawPath } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
import { YearnWithdrawActionType } from '../WithdrawReducer'

type YearnWithdrawProps = {
  api: YearnVaultApi
}

export const Withdraw = ({ api }: YearnWithdrawProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const history = useHistory()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  // Asset info
  const underlyingAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: tokenId,
  })
  const assetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, underlyingAssetCAIP19))

  // user info
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetCAIP19))

  if (!state || !dispatch) return null

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateWithdrawGas({
          tokenContractAddress: tokenId,
          vaultAddress,
          amountDesired: bnOrZero(withdraw.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress,
        }),
        api.getGasPrice(),
      ])
      const returVal = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
      return returVal
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error('YearnWithdraw:getWithdrawGasEstimate error:', error)
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!state.userAddress) return
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
  const pricePerShare = bnOrZero(state.pricePerShare).div(`1e+${asset?.precision}`)
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
