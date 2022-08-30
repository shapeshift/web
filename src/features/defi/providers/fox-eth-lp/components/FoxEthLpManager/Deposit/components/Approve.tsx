import { useToast } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { foxAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxEthLpDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type FoxEthLpApproveProps = {
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['FoxEthLpDeposit:Approve'] })

export const Approve: React.FC<FoxEthLpApproveProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const { approve, allowance, getDepositGasData } = useFoxEthLiquidityPool()
  const opportunity = state?.opportunity

  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

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
      dispatch({ type: FoxEthLpDepositActionType.SET_LOADING, payload: true })
      await approve()
      await poll({
        fn: () => allowance(),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(foxAsset.precision))
          return bnOrZero(allowance).gte(bnOrZero(state.deposit.foxCryptoAmount))
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get deposit gas estimate
      const gasData = await getDepositGasData(
        state.deposit.foxCryptoAmount,
        state.deposit.ethCryptoAmount,
      )
      if (!gasData) return
      const estimatedGasCrypto = bnOrZero(gasData.average.txFee)
        .div(bn(10).pow(feeAsset.precision))
        .toPrecision()
      dispatch({
        type: FoxEthLpDepositActionType.SET_DEPOSIT,
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
      dispatch({ type: FoxEthLpDepositActionType.SET_LOADING, payload: false })
    }
  }

  return (
    <ReusableApprove
      asset={foxAsset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto).toFixed(5)}
      disableAction
      fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approveOnWallet')}
      providerIcon={foxAsset.icon}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={FOX_TOKEN_CONTRACT_ADDRESS}
    />
  )
}
