import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { poll } from 'lib/poll/poll'
import { isSome } from 'lib/utils'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
} from 'state/slices/selectors'
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
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { lpAccountId } = useFoxEth()
  const { approve, allowance, getWithdrawGasData } = useFoxEthLiquidityPool(lpAccountId)

  const foxEthLpOpportunityFilter = useMemo(
    () => ({
      lpId: foxEthLpAssetId,
      assetId: foxEthLpAssetId,
      accountId,
    }),
    [accountId],
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, foxEthLpOpportunityFilter),
  )

  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const assets = useAppSelector(selectAssets)
  if (!foxAsset) throw new Error('Fox asset not found')
  if (!feeAsset) throw new Error('Fee asset not found')

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  // user info
  const {
    state: { wallet },
  } = useWallet()

  // notify
  const toast = useToast()

  const handleApprove = useCallback(async () => {
    if (!dispatch || !state?.withdraw || !foxEthLpOpportunity || !wallet || !supportsETH(wallet))
      return

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
      const estimatedGasCryptoPrecision = bnOrZero(gasData.average.txFee)
        .div(bn(10).pow(feeAsset.precision))
        .toPrecision()
      dispatch({
        type: FoxEthLpWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCryptoPrecision },
      })

      onNext(DefiStep.Confirm)
      trackOpportunityEvent(
        MixPanelEvents.WithdrawApprove,
        {
          opportunity: foxEthLpOpportunity,
          fiatAmounts: [],
          cryptoAmounts: [],
        },
        assets,
      )
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
    dispatch,
    state?.withdraw,
    foxEthLpOpportunity,
    wallet,
    approve,
    getWithdrawGasData,
    feeAsset.precision,
    onNext,
    assets,
    allowance,
    foxAsset.precision,
    toast,
    translate,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(estimatedGasCryptoPrecision) &&
      isSome(accountId) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Withdraw}
        feeAsset={feeAsset}
        estimatedGasCryptoPrecision={estimatedGasCryptoPrecision}
      />
    ),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas && mixpanel) {
      mixpanel.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!state || !dispatch) return null

  return (
    <ReusableApprove
      asset={foxAsset}
      feeAsset={feeAsset}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approveOnWallet')}
      preFooter={preFooter}
      providerIcon={foxAsset?.icon}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={fromAssetId(foxEthLpAssetId).assetReference}
    />
  )
}
