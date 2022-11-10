import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { UNISWAP_V2_WETH_FOX_POOL_ADDRESS } from 'features/defi/providers/fox-eth-lp/constants'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { isSome } from 'lib/utils'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxEthLpWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type FoxEthLpApproveProps = StepComponentProps & {
  accountId: AccountId | undefined
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['FoxEthLpWithdraw:Approve'] })

export const Approve: React.FC<FoxEthLpApproveProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const estimatedGasCrypto = state?.approve.estimatedGasCrypto
  const translate = useTranslate()
  const { lpAccountAddress } = useFoxEth()
  const { approve, allowance, getWithdrawGasData } = useFoxEthLiquidityPool(lpAccountAddress)
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

  const handleApprove = useCallback(async () => {
    if (!dispatch || !opportunity || !wallet || !supportsETH(wallet)) return

    try {
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: true })
      await approve(true)
      await poll({
        fn: () => allowance(true),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(foxAsset.precision))
          return bnOrZero(allowance).gte(bnOrZero(state.withdraw.lpAmount))
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get deposit gas estimate
      const gasData = await getWithdrawGasData(
        state.withdraw.lpAmount,
        state.withdraw.foxAmount,
        state.withdraw.ethAmount,
      )
      if (!gasData) return
      const estimatedGasCrypto = bnOrZero(gasData.average.txFee)
        .div(bn(10).pow(feeAsset.precision))
        .toPrecision()
      dispatch({
        type: FoxEthLpWithdrawActionType.SET_WITHDRAW,
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
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    allowance,
    approve,
    dispatch,
    getWithdrawGasData,
    foxAsset.precision,
    feeAsset.precision,
    state?.withdraw.lpAmount,
    state?.withdraw.ethAmount,
    state?.withdraw.foxAmount,
    onNext,
    opportunity,
    toast,
    translate,
    wallet,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(estimatedGasCrypto) &&
      isSome(accountId) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCrypto,
        accountId,
      }),
    [accountId, feeAsset, estimatedGasCrypto],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Withdraw}
        feeAsset={feeAsset}
        estimatedGasCrypto={estimatedGasCrypto}
      />
    ),
    [accountId, feeAsset, estimatedGasCrypto],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableApprove
      asset={foxAsset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(estimatedGasCrypto).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCrypto).times(feeMarketData.price).toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approveOnWallet')}
      preFooter={preFooter}
      providerIcon={foxAsset.icon}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={UNISWAP_V2_WETH_FOX_POOL_ADDRESS}
    />
  )
}
