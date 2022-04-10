import { useToast } from '@chakra-ui/react'
import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { YearnVaultApi } from '@shapeshiftoss/investor-yearn'
import { NetworkTypes } from '@shapeshiftoss/types'
import { Deposit as ReusableDeposit, DepositValues } from 'features/defi/components/Deposit/Deposit'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { DepositPath } from '../DepositCommon'
import { DepositContext } from '../DepositContext'
import { YearnDepositActionType } from '../DepositReducer'

export type YearnDepositProps = {
  api: YearnVaultApi
  apy: number | undefined
  getDepositGasEstimate: (deposit: DepositValues) => Promise<string | undefined>
}

export const Deposit = ({ api, apy, getDepositGasEstimate }: YearnDepositProps) => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, tokenId } = query

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, assetNamespace, assetReference: tokenId })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetCAIP19))

  // user info
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetCAIP19))

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const getApproveGasEstimate = async () => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateApproveGas({
          tokenContractAddress: tokenId,
          userAddress: state.userAddress,
        }),
        api.getGasPrice(),
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('YearnDeposit:getApproveEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const handleContinue = async (formValues: DepositValues) => {
    if (!state.userAddress) return
    // set deposit state for future use
    dispatch({ type: YearnDepositActionType.SET_DEPOSIT, payload: formValues })
    try {
      // Check is approval is required for user address
      const _allowance = await api.allowance({
        tokenContractAddress: tokenId!,
        userAddress: state.userAddress,
      })
      const allowance = bnOrZero(_allowance).div(`1e+${asset.precision}`)

      // Skip approval step if user allowance is greater than requested deposit amount
      if (allowance.gt(formValues.cryptoAmount)) {
        const estimatedGasCrypto = await getDepositGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: YearnDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto },
        })
        history.push(DepositPath.Confirm)
      } else {
        const estimatedGasCrypto = await getApproveGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: YearnDepositActionType.SET_APPROVE,
          payload: { estimatedGasCrypto },
        })
        history.push(DepositPath.Approve)
      }
    } catch (error) {
      console.error('YearnDeposit:handleContinue error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
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

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${asset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  return (
    <ReusableDeposit
      asset={asset}
      apy={String(apy)}
      cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
      cryptoInputValidation={{
        required: true,
        validate: { validateCryptoAmount },
      }}
      fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
      fiatInputValidation={{
        required: true,
        validate: { validateFiatAmount },
      }}
      marketData={marketData}
      onCancel={handleCancel}
      onContinue={handleContinue}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
    />
  )
}
