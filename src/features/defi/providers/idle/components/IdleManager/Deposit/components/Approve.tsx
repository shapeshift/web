import { useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ssRouterContractAddress } from '@shapeshiftoss/investor-idle'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
import {
  DefiParams,
  DefiQueryParams,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type IdleApproveProps = {
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['IdleDeposit:Approve'] })

export const Approve: React.FC<IdleApproveProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const { idle: idleInvestor } = useIdle()
  const opportunity = state?.opportunity

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

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const getDepositGasEstimate = async (deposit: DepositValues): Promise<string | undefined> => {
    if (!(state.userAddress && state.opportunity && assetReference && idleInvestor)) return
    try {
      const idleOpportunity = await idleInvestor.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!idleOpportunity) throw new Error('No opportunity')
      const preparedTx = await idleOpportunity.prepareDeposit({
        amount: bnOrZero(deposit.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
        address: state.userAddress,
      })
      // TODO(theobold): Figure out a better way for the safety factor
      return bnOrZero(preparedTx.gasPrice).times(preparedTx.estimatedGas).integerValue().toString()
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
    if (
      !(
        assetReference &&
        state.userAddress &&
        walletState.wallet &&
        supportsETH(walletState.wallet) &&
        opportunity
      )
    )
      return

    try {
      dispatch({ type: IdleDepositActionType.SET_LOADING, payload: true })
      const idleOpportunity = await idleInvestor?.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!idleOpportunity) throw new Error('No opportunity')
      const tx = await idleOpportunity.prepareApprove(state.userAddress)
      await idleOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
      })
      const address = state.userAddress
      await poll({
        fn: () => idleOpportunity.allowance(address),
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
        type: IdleDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto },
      })

      onNext(DefiStep.Confirm)
    } catch (error) {
      moduleLogger.error({ fn: 'handleApprove', error }, 'Error getting approval gas estimate')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: IdleDepositActionType.SET_LOADING, payload: false })
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
      providerIcon='https://assets.coincap.io/assets/icons/256/fox.png'
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={ssRouterContractAddress}
    />
  )
}
