import { Alert, AlertDescription, useColorModeValue, useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import {
  DefiParams,
  DefiQueryParams,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useContext } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Foxy', 'Withdraw', 'Approve'],
})

export const Approve = ({ onNext }: StepComponentProps) => {
  const { foxy: api } = useFoxy()
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const alertText = useColorModeValue('blue.800', 'white')
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, rewardId } = query
  const toast = useToast()

  const assetNamespace = 'erc20'
  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const { state: walletState } = useWallet()

  if (!state || !dispatch) return null

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    if (!state.userAddress || !rewardId || !api) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateWithdrawGas({
          tokenContractAddress: rewardId,
          contractAddress,
          amountDesired: bnOrZero(
            bn(withdraw.cryptoAmount).times(`1e+${asset.precision}`),
          ).decimalPlaces(0),
          userAddress: state.userAddress,
          type: state.withdraw.withdrawType,
        }),
        api.getGasPrice(),
      ])
      const returVal = bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
      return returVal
    } catch (error) {
      moduleLogger.error(error, { fn: 'getWithdrawGasEstimate' }, 'getWithdrawGasEstimate error')
      const fundsError =
        error instanceof Error && error.message.includes('Not enough funds in reserve')
      toast({
        position: 'top-right',
        description: fundsError
          ? translate('defi.notEnoughFundsInReserve')
          : translate('common.somethingWentWrong'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const handleApprove = async () => {
    if (!rewardId || !state.userAddress || !walletState.wallet || !api) return
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
        maxAttempts: 60,
      })
      // Get withdraw gas estimate
      const estimatedGasCrypto = await getWithdrawGasEstimate(state.withdraw)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })
      onNext(DefiStep.Confirm)
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleApprove' }, 'handleApprove error')
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
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={
        <Alert status='info' borderRadius='lg' color='blue.500'>
          <FaGasPump />
          <AlertDescription textAlign='left' ml={3} color={alertText}>
            {translate('modals.withdraw.withdrawFee')}
          </AlertDescription>
        </Alert>
      }
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={contractAddress}
    />
  )
}
