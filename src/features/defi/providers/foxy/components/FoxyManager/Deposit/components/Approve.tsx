import { Alert, AlertDescription, useColorModeValue, useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
import {
  DefiParams,
  DefiQueryParams,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useContext } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['FoxyDeposit:Approve'] })

export const Approve: React.FC<StepComponentProps> = ({ onNext }) => {
  const { foxy: api } = useFoxy()
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const toast = useToast()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const alertText = useColorModeValue('blue.800', 'white')
  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const { state: walletState } = useWallet()

  if (!state || !dispatch) return null

  const getDepositGasEstimate = async (deposit: DepositValues) => {
    if (!state.userAddress || !assetReference || !api) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateDepositGas({
          tokenContractAddress: assetReference,
          contractAddress,
          amountDesired: bnOrZero(deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress,
        }),
        api.getGasPrice(),
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      moduleLogger.error(
        { fn: 'getDepositGasEstimate', error },
        'Error getting deposit gas estimate',
      )
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const handleApprove = async () => {
    if (!assetReference || !state.userAddress || !walletState.wallet || !api) return
    try {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: assetReference,
        contractAddress,
        userAddress: state.userAddress,
        wallet: walletState.wallet,
        amount: bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`).toString(),
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: assetReference,
            contractAddress,
            userAddress: state.userAddress!,
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(`1e+${asset.precision}`)
          return bnOrZero(allowance).gt(state.deposit.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 60,
      })
      // Get deposit gas estimate
      const estimatedGasCrypto = await getDepositGasEstimate(state.deposit)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxyDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto },
      })

      onNext(DefiStep.Confirm)
    } catch (error) {
      moduleLogger.error({ fn: 'handleApprove', error }, 'Error on approval')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
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
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={
        <Alert status='info' borderRadius='lg' color='blue.500'>
          <FaGasPump />
          <AlertDescription textAlign='left' ml={3} color={alertText}>
            {translate('modals.approve.depositFee')}
          </AlertDescription>
        </Alert>
      }
      isExactAllowance={state.isExactAllowance}
      onCancel={() => history.push('/')}
      onConfirm={handleApprove}
      contractAddress={contractAddress}
      onToggle={() =>
        dispatch({
          type: FoxyDepositActionType.SET_IS_EXACT_ALLOWANCE,
          payload: !state.isExactAllowance,
        })
      }
    />
  )
}
