import { fromAccountId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { RfoxBridgeQuote } from './Bridge/types'
import { BridgeRoutePaths } from './Bridge/types'
import type { RfoxStakingQuote, StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

import { getAffiliateRevenueQueryKey } from '@/pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { getEarnedQueryKey } from '@/pages/RFOX/hooks/useEarnedQuery'
import { getEpochHistoryQueryKey } from '@/pages/RFOX/hooks/useEpochHistoryQuery'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { getStakingBalanceOfQueryKey } from '@/pages/RFOX/hooks/useStakingBalanceOfQuery'
import { getStakingInfoQueryKey } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { getTimeInPoolQueryKey } from '@/pages/RFOX/hooks/useTimeInPoolQuery'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const suspenseFallback = <div>Loading...</div>

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

  // Get bridge quote from location.state
  const maybeBridgeQuote = location.state as RfoxBridgeQuote | undefined

  const stakingAssetAccountAddress = useMemo(() => {
    return confirmedQuote ? fromAccountId(confirmedQuote.stakingAssetAccountId).account : undefined
  }, [confirmedQuote])

  const handleTxConfirmed = useCallback(async () => {
    if (!confirmedQuote) return

    await queryClient.invalidateQueries({
      queryKey: getStakingInfoQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountAddress,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getStakingBalanceOfQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountAddress,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getTimeInPoolQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountAddress,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getEpochHistoryQueryKey(),
    })
    await queryClient.invalidateQueries({
      queryKey: getEarnedQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountAddress,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getAffiliateRevenueQueryKey({
        startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
        endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
      }),
    })
  }, [confirmedQuote, queryClient, stakingAssetAccountAddress, currentEpochMetadataQuery.data])

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
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        <Switch location={location.pathname}>
          <Route path={StakeRoutePaths.Input}>{renderStakeInput()}</Route>
          <Route path={StakeRoutePaths.Confirm}>{renderStakeConfirm()}</Route>
          <Route path={StakeRoutePaths.Status}>{renderStakeStatus()}</Route>
          <Route path={BridgeRoutePaths.Confirm}>{renderBridgeConfirm()}</Route>
          <Route path={BridgeRoutePaths.Status}>{renderBridgeStatus()}</Route>
        </Switch>
      </Suspense>
    </AnimatePresence>
  )
}
