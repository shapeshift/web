import { useToast } from '@chakra-ui/react'
import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { NetworkTypes, WithdrawType } from '@shapeshiftoss/types'
import {
  Withdraw as ReusableWithdraw,
  WithdrawValues,
} from 'features/defi/components/Withdraw/Withdraw'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { WithdrawPath } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
import { FoxyWithdrawActionType } from '../WithdrawReducer'

type FoxyWithdrawProps = {
  api: FoxyApi
  getWithdrawGasEstimate: (withdraw: WithdrawValues) => Promise<string | undefined>
}

export const Withdraw = ({ api, getWithdrawGasEstimate }: FoxyWithdrawProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const history = useHistory()
  const translate = useTranslate()
  const appDispatch = useAppDispatch()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress, rewardId } = query
  const toast = useToast()

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  // Asset info
  const assetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: rewardId,
  })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetCAIP19))

  // user info
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetCAIP19))

  const withdrawalFee = useMemo(() => {
    return state?.withdraw.withdrawType === WithdrawType.INSTANT
      ? bnOrZero(bn(state.withdraw.cryptoAmount).times(state.foxyFeePercentage)).toString()
      : '0'
  }, [state?.withdraw.withdrawType, state?.withdraw.cryptoAmount, state?.foxyFeePercentage])

  if (!state || !dispatch) return null

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!state.userAddress) return
    // set withdraw state for future use
    dispatch({
      type: FoxyWithdrawActionType.SET_WITHDRAW,
      payload: formValues,
    })
    try {
      // Check is approval is required for user address
      const _allowance = await api.allowance({
        tokenContractAddress: rewardId,
        contractAddress,
        userAddress: state.userAddress,
      })

      const allowance = bnOrZero(bn(_allowance).div(`1e+${asset.precision}`))

      // Skip approval step if user allowance is greater than requested deposit amount
      if (allowance.gte(formValues.cryptoAmount)) {
        const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxyWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCrypto },
        })
        history.push(WithdrawPath.Confirm)
      } else {
        const estimatedGasCrypto = await getApproveGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxyWithdrawActionType.SET_APPROVE,
          payload: { estimatedGasCrypto },
        })
        history.push(WithdrawPath.Approve)
      }
    } catch (error) {
      console.error('FoxyWithdraw:handleContinue error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const getApproveGasEstimate = async () => {
    if (!state.userAddress || !rewardId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateApproveGas({
          tokenContractAddress: rewardId,
          contractAddress,
          userAddress: state.userAddress,
        }),
        api.getGasPrice(),
      ])
      return bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
    } catch (error) {
      console.error('FoxyWithdraw:getApproveEstimate error:', error)
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
    const crypto = bnOrZero(bn(balance).div(`1e+${asset.precision}`))
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(bn(balance).div(`1e+${asset.precision}`))
    const fiat = crypto.times(bnOrZero(marketData?.price))
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const cryptoAmountAvailable = bnOrZero(bn(balance).div(`1e+${asset?.precision}`))
  const fiatAmountAvailable = bnOrZero(bn(cryptoAmountAvailable).times(bnOrZero(marketData?.price)))

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
      marketData={marketData}
      onCancel={handleCancel}
      onContinue={handleContinue}
      updateWithdraw={({ withdrawType, cryptoAmount }) => {
        return dispatch({
          type: FoxyWithdrawActionType.SET_WITHDRAW,
          payload: { withdrawType, cryptoAmount },
        })
      }}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
      enableWithdrawType
      feePercentage={bnOrZero(state.foxyFeePercentage).times(100).toString()}
    >
      <Row>
        <Row.Label>{translate('modals.withdraw.withDrawalFee')}</Row.Label>
        <Row.Value>
          <Amount.Crypto value={withdrawalFee} symbol={asset.symbol} />
        </Row.Value>
      </Row>
      <Text fontSize='sm' color='gray.500' translation='modals.withdraw.disclaimer' />
    </ReusableWithdraw>
  )
}
