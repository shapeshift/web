import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS } from 'contracts/constants'
import { ethers } from 'ethers'
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
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
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

export const Approve: React.FC<UniV2ApproveProps> = ({ accountId, onNext }) => {
  const poll = usePoll()
  const { state, dispatch } = useContext(WithdrawContext)
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const translate = useTranslate()
  const mixpanel = getMixPanel()

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

  const { approveAsset, lpAllowance, getWithdrawFeeData } = useUniV2LiquidityPool({
    accountId: accountId ?? '',
    assetId0: lpOpportunity?.underlyingAssetIds[0] ?? '',
    assetId1: lpOpportunity?.underlyingAssetIds[1] ?? '',
    lpAssetId,
  })

  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))
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
    if (
      !dispatch ||
      !lpAsset ||
      !state?.withdraw ||
      !lpOpportunity ||
      !wallet ||
      !supportsETH(wallet)
    )
      return

    try {
      dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: true })
      const lpAssetContractAddress = ethers.utils.getAddress(fromAssetId(lpAssetId).assetReference)
      await approveAsset(lpAssetContractAddress)
      await poll({
        fn: () => lpAllowance(),
        validate: (result: string) => {
          const lpAllowance = bnOrZero(result).div(bn(10).pow(lpAsset.precision))
          return bnOrZero(lpAllowance).gte(bnOrZero(state.withdraw.lpAmount))
        },
        interval: 15000,
        maxAttempts: 30,
      })
      const feeData = await getWithdrawFeeData(
        state.withdraw.lpAmount,
        state.withdraw.asset0Amount,
        state.withdraw.asset1Amount,
      )
      if (!feeData) return
      const estimatedGasCryptoPrecision = bnOrZero(feeData.txFee)
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
      console.error(error)
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
    lpAsset,
    state?.withdraw,
    lpOpportunity,
    wallet,
    lpAssetId,
    approveAsset,
    poll,
    getWithdrawFeeData,
    feeAsset.precision,
    onNext,
    assets,
    lpAllowance,
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

  if (!state || !dispatch || !lpOpportunity || !lpAsset) return null

  return (
    <ReusableApprove
      asset={lpAsset}
      feeAsset={feeAsset}
      spenderName={lpOpportunity.provider}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      preFooter={preFooter}
      providerIcon={getMetadataForProvider(lpOpportunity.provider)?.icon ?? ''}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      spenderContractAddress={UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS}
    />
  )
}
