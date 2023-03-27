import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useUniV2LiquidityPool } from 'features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { poll } from 'lib/poll/poll'
import { isSome } from 'lib/utils'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UniV2WithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type UniV2ApproveProps = StepComponentProps & {
  accountId: AccountId | undefined
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['UniV2Withdraw:Approve'] })

export const Approve: React.FC<UniV2ApproveProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { lpAccountId } = useFoxEth()

  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const lpAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const lpOpportunityFilter = useMemo(
    () => ({
      lpId: lpAssetId as LpId,
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )
  const lpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, lpOpportunityFilter),
  )

  const assetId0 = lpOpportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = lpOpportunity?.underlyingAssetIds[1] ?? ''

  const { approve, allowance, getWithdrawGasData } = useUniV2LiquidityPool({
    accountId: lpAccountId ?? '',
    assetId0: lpOpportunity?.underlyingAssetIds[0] ?? '',
    assetId1: lpOpportunity?.underlyingAssetIds[1] ?? '',
    lpAssetId,
  })

  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const feeAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const assets = useAppSelector(selectAssets)
  if (!asset0) throw new Error('Asset 0 not found')
  if (!asset1) throw new Error('Asset 1 not found')
  if (!feeAsset) throw new Error('Fee asset not found')

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  // user info
  const {
    state: { wallet },
  } = useWallet()

  // notify
  const toast = useToast()

  const handleApprove = useCallback(async () => {
    if (!dispatch || !state?.withdraw || !lpOpportunity || !wallet || !supportsETH(wallet)) return

    try {
      dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: true })
      await approve(true)
      await poll({
        fn: () => allowance(true),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(asset1.precision))
          return bnOrZero(allowance).gte(bnOrZero(state.withdraw.lpAmount))
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get deposit gas estimate
      const gasData = await getWithdrawGasData(
        state.withdraw.lpAmount,
        state.withdraw.asset1Amount,
        state.withdraw.asset0Amount,
      )
      if (!gasData) return
      const estimatedGasCryptoPrecision = bnOrZero(gasData.average.txFee)
        .div(bn(10).pow(feeAsset.precision))
        .toPrecision()
      dispatch({
        type: UniV2WithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCryptoPrecision },
      })

      onNext(DefiStep.Confirm)
      trackOpportunityEvent(
        MixPanelEvents.WithdrawApprove,
        {
          opportunity: lpOpportunity,
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
      dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    state?.withdraw,
    lpOpportunity,
    wallet,
    approve,
    getWithdrawGasData,
    feeAsset.precision,
    onNext,
    assets,
    allowance,
    asset1.precision,
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
      asset={asset1}
      feeAsset={feeAsset}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approveOnWallet')}
      preFooter={preFooter}
      providerIcon={asset1?.icon}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={fromAssetId(lpAssetId).assetReference}
    />
  )
}
