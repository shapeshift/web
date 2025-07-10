import { useQueryClient } from '@tanstack/react-query'
import React, { lazy, useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { RfoxBridgeQuote } from './Bridge/types'
import { BridgeRoutePaths } from './Bridge/types'
import type { RfoxStakingQuote, StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { fromBaseUnit } from '@/lib/math'
import { getAffiliateRevenueQueryKey } from '@/pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { getEarnedQueryKey } from '@/pages/RFOX/hooks/useEarnedQuery'
import { getEpochHistoryQueryKey } from '@/pages/RFOX/hooks/useEpochHistoryQuery'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { getStakingBalanceOfQueryKey } from '@/pages/RFOX/hooks/useStakingBalanceOfQuery'
import { getStakingInfoQueryKey } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { getTimeInPoolQueryKey } from '@/pages/RFOX/hooks/useTimeInPoolQuery'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const StakeInput = makeSuspenseful(
  lazy(() =>
    import('./StakeInput').then(({ StakeInput }) => ({
      default: StakeInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./StakeConfirm').then(({ StakeConfirm }) => ({
      default: StakeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeStatus = makeSuspenseful(
  lazy(() =>
    import('./StakeStatus').then(({ StakeStatus }) => ({
      default: StakeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const BridgeConfirm = makeSuspenseful(
  lazy(() =>
    import('./Bridge/BridgeConfirm').then(({ BridgeConfirm }) => ({
      default: BridgeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const BridgeStatus = makeSuspenseful(
  lazy(() =>
    import('./Bridge/BridgeStatus').then(({ BridgeStatus }) => ({
      default: BridgeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeEntries = [StakeRoutePaths.Input, StakeRoutePaths.Confirm, StakeRoutePaths.Status]

export const Stake: React.FC<StakeRouteProps> = ({ headerComponent, setStepIndex }) => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes headerComponent={headerComponent} setStepIndex={setStepIndex} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<StakeRouteProps> = ({ headerComponent, setStepIndex }) => {
  const location = useLocation()

  const [runeAddress, setRuneAddress] = useState<string | undefined>()
  const [confirmedQuote, setConfirmedQuote] = useState<RfoxStakingQuote | undefined>()
  const [stakeTxid, setStakeTxid] = useState<string | undefined>()

  const queryClient = useQueryClient()
  const { stakingAssetId } = useRFOXContext()
  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const translate = useTranslate()

  // Get bridge quote from location.state
  const maybeBridgeQuote = location.state as RfoxBridgeQuote | undefined

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote?.stakingAssetId ?? ''),
  )

  const handleTxConfirmed = useCallback(async () => {
    if (!confirmedQuote || !stakeTxid || !stakingAsset) return

    const amountCryptoPrecision = fromBaseUnit(
      confirmedQuote.stakingAmountCryptoBaseUnit,
      stakingAsset.precision,
    )
    const symbol = stakingAsset.symbol

    dispatch(
      actionSlice.actions.upsertAction({
        id: stakeTxid,
        type: ActionType.GenericTransaction,
        status: ActionStatus.Complete,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        transactionMetadata: {
          displayType: GenericTransactionDisplayType.RFOX,
          txHash: stakeTxid,
          chainId: stakingAsset.chainId,
          accountId: confirmedQuote.stakingAssetAccountId,
          assetId: confirmedQuote.stakingAssetId,
          message: translate('RFOX.stakeSuccess', { amount: amountCryptoPrecision, symbol }),
        },
      }),
    )
    toast({
      id: stakeTxid,
      duration: isDrawerOpen ? 5000 : null,
      status: 'success',
      render: ({ onClose, ...props }) => {
        const handleClick = () => {
          onClose()
          openActionCenter()
        }

        return (
          <GenericTransactionNotification
            // eslint-disable-next-line react-memo/require-usememo
            handleClick={handleClick}
            actionId={stakeTxid}
            onClose={onClose}
            {...props}
          />
        )
      },
    })

    await queryClient.invalidateQueries({
      queryKey: getStakingInfoQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountId: confirmedQuote.stakingAssetAccountId,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getStakingBalanceOfQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        accountId: confirmedQuote.stakingAssetAccountId,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getTimeInPoolQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountId: confirmedQuote.stakingAssetAccountId,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getEpochHistoryQueryKey(),
    })
    await queryClient.invalidateQueries({
      queryKey: getEarnedQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountId: confirmedQuote.stakingAssetAccountId,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getAffiliateRevenueQueryKey({
        startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
        endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
      }),
    })
  }, [
    confirmedQuote,
    stakeTxid,
    dispatch,
    isDrawerOpen,
    openActionCenter,
    toast,
    translate,
    currentEpochMetadataQuery,
    queryClient,
    stakingAsset,
  ])

  const renderStakeInput = useCallback(() => {
    return (
      <StakeInput
        stakingAssetId={stakingAssetId}
        runeAddress={runeAddress}
        headerComponent={headerComponent}
        setStepIndex={setStepIndex}
        onRuneAddressChange={setRuneAddress}
        setConfirmedQuote={setConfirmedQuote}
      />
    )
  }, [headerComponent, runeAddress, setStepIndex, stakingAssetId])

  const renderStakeConfirm = useCallback(() => {
    if (!confirmedQuote) return null

    return (
      <StakeConfirm
        stakeTxid={stakeTxid}
        setStakeTxid={setStakeTxid}
        setStepIndex={setStepIndex}
        confirmedQuote={confirmedQuote}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, headerComponent, stakeTxid, setStepIndex])

  const renderStakeStatus = useCallback(() => {
    if (!confirmedQuote) return null
    if (!stakeTxid) return null

    return (
      <StakeStatus
        txId={stakeTxid}
        setStakeTxid={setStakeTxid}
        confirmedQuote={confirmedQuote}
        setStepIndex={setStepIndex}
        onTxConfirmed={handleTxConfirmed}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, handleTxConfirmed, headerComponent, stakeTxid, setStepIndex])

  const renderBridgeConfirm = useCallback(() => {
    if (!maybeBridgeQuote) return null

    return <BridgeConfirm confirmedQuote={maybeBridgeQuote} headerComponent={headerComponent} />
  }, [maybeBridgeQuote, headerComponent])

  const renderBridgeStatus = useCallback(() => {
    if (!maybeBridgeQuote) return null

    return <BridgeStatus confirmedQuote={maybeBridgeQuote} headerComponent={headerComponent} />
  }, [maybeBridgeQuote, headerComponent])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={StakeRoutePaths.Input}>{renderStakeInput()}</Route>
        <Route path={StakeRoutePaths.Confirm}>{renderStakeConfirm()}</Route>
        <Route path={StakeRoutePaths.Status}>{renderStakeStatus()}</Route>
        <Route path={BridgeRoutePaths.Confirm}>{renderBridgeConfirm()}</Route>
        <Route path={BridgeRoutePaths.Status}>{renderBridgeStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
