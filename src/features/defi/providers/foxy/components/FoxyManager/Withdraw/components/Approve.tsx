import { Alert, AlertDescription, useColorModeValue, useToast } from '@chakra-ui/react'
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { NetworkTypes } from '@shapeshiftoss/types'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { WithdrawPath } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'
import { FoxyWithdrawActionType } from '../WithdrawReducer'

type FoxyApproveProps = {
  api: FoxyApi
  getWithdrawGasEstimate: (withdraw: WithdrawValues) => Promise<string | undefined>
}

export const Approve = ({ api, getWithdrawGasEstimate }: FoxyApproveProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const history = useHistory()
  const translate = useTranslate()
  const appDispatch = useAppDispatch()
  const alertText = useColorModeValue('blue.800', 'white')
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
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
  const feeAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))

  // user info
  const { state: walletState } = useWallet()

  if (!state || !dispatch) return null

  const handleApprove = async () => {
    if (!rewardId || !state.userAddress || !walletState.wallet) return
    try {
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: rewardId,
        contractAddress,
        userAddress: state.userAddress,
        wallet: walletState.wallet,
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: rewardId,
            contractAddress,
            userAddress: state.userAddress!,
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(bn(result).div(`1e+${asset.precision}`))
          return bnOrZero(allowance).gt(state.withdraw.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get withdraw gas estimate
      const estimatedGasCrypto = await getWithdrawGasEstimate(state.withdraw)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })

      history.push(WithdrawPath.Confirm)
    } catch (error) {
      console.error('FoxyWithdraw:handleApprove error:', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: false })
    }
  }

  return (
    <ReusableApprove
      asset={asset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(`1e+${feeAsset.precision}`)
        .toFixed(5)}
      disableAction
      fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(`1e+${feeAsset.precision}`)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approveOnWallet')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={
        <Alert status='info' borderRadius='lg' color='blue.500'>
          <FaGasPump />
          <AlertDescription textAlign='left' ml={3} color={alertText}>
            {translate('modals.withdraw.withdrawFee')}
          </AlertDescription>
        </Alert>
      }
      onCancel={() => history.push('/')}
      onConfirm={handleApprove}
    />
  )
}
