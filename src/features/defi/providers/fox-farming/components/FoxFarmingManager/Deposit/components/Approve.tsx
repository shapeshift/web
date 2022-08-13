import { useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import {
  DefiParams,
  DefiQueryParams,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type FoxFarmingApproveProps = {
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['FoxFarmingDeposit:Approve'] })

export const Approve: React.FC<FoxFarmingApproveProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference, contractAddress } = query
  const opportunity = state?.opportunity
  const { allowance, approve, getStakeGasData } = useFoxFarming(contractAddress)

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
  const {
    state: { wallet },
  } = useWallet()

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const handleApprove = async () => {
    if (!opportunity || !wallet || !supportsETH(wallet)) return

    try {
      dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: true })
      await approve()
      await poll({
        fn: () => allowance(),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(`1e+${asset.precision}`)
          return bnOrZero(allowance).gt(bnOrZero(state.deposit.cryptoAmount))
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get deposit gas estimate
      const gasData = await getStakeGasData(state.deposit.cryptoAmount)
      if (!gasData) return
      const estimatedGasCrypto = bnOrZero(gasData.average.txFee)
        .div(`1e${feeAsset.precision}`)
        .toPrecision()
      dispatch({
        type: FoxFarmingDepositActionType.SET_DEPOSIT,
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
      dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: false })
    }
  }

  return (
    <ReusableApprove
      asset={asset}
      feeAsset={feeAsset}
      icons={opportunity?.icons}
      cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto).toFixed(5)}
      disableAction
      fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approveOnWallet')}
      providerIcon='https://assets.coincap.io/assets/icons/256/fox.png'
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={opportunity?.contractAddress ?? ''}
    />
  )
}
