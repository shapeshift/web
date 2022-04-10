import { Alert, AlertDescription, useColorModeValue, useToast } from '@chakra-ui/react'
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { YearnVaultApi } from '@shapeshiftoss/investor-yearn'
import { NetworkTypes } from '@shapeshiftoss/types'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { DepositPath } from '../DepositCommon'
import { DepositContext } from '../DepositContext'
import { YearnDepositActionType } from '../DepositReducer'

export type YearnApproveProps = {
  api: YearnVaultApi
  getDepositGasEstimate: (deposit: DepositValues) => Promise<string | undefined>
}

export const Approve = ({ api, getDepositGasEstimate }: YearnApproveProps) => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, tokenId } = query
  const alertText = useColorModeValue('blue.800', 'white')

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, assetNamespace, assetReference: tokenId })
  const feeAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum,
  })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetCAIP19))
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const handleApprove = async () => {
    if (!tokenId || !state.userAddress || !walletState.wallet) return
    try {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: tokenId,
        userAddress: state.userAddress,
        wallet: walletState.wallet,
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: tokenId!,
            userAddress: state.userAddress!,
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(`1e+${asset.precision}`)
          return bnOrZero(allowance).gt(state.deposit.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get deposit gas estimate
      const estimatedGasCrypto = await getDepositGasEstimate(state.deposit)
      if (!estimatedGasCrypto) return
      dispatch({
        type: YearnDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto },
      })

      history.push(DepositPath.Confirm)
    } catch (error) {
      console.error('YearnDeposit:handleApprove error:', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
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
      loadingText='Approve on Wallet'
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={
        <Alert status='info' borderRadius='lg' color='blue.500'>
          <FaGasPump />
          <AlertDescription textAlign='left' ml={3} color={alertText}>
            {translate('modals.approve.depositFee')}
          </AlertDescription>
        </Alert>
      }
      onCancel={() => history.push('/')}
      onConfirm={handleApprove}
    />
  )
}
