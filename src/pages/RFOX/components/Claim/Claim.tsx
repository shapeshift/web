import { fromAccountId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { useGetUnstakingRequestCountQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestCountQuery'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'

import type { RfoxClaimQuote } from './types'
import { ClaimRoutePaths, type ClaimRouteProps } from './types'

const suspenseFallback = <div>Loading...</div>

const ClaimSelect = makeSuspenseful(
  lazy(() =>
    import('./ClaimSelect').then(({ ClaimSelect }) => ({
      default: ClaimSelect,
    })),
  ),
)

const ClaimConfirm = makeSuspenseful(
  lazy(() =>
    import('./ClaimConfirm').then(({ ClaimConfirm }) => ({
      default: ClaimConfirm,
    })),
  ),
)

const ClaimStatus = makeSuspenseful(
  lazy(() =>
    import('./ClaimStatus').then(({ ClaimStatus }) => ({
      default: ClaimStatus,
    })),
  ),
)

const ClaimEntries = [ClaimRoutePaths.Select, ClaimRoutePaths.Confirm, ClaimRoutePaths.Status]

export const Claim: React.FC<ClaimRouteProps> = ({ headerComponent, setStepIndex }) => {
  return (
    <MemoryRouter initialEntries={ClaimEntries} initialIndex={0}>
      <ClaimRoutes headerComponent={headerComponent} setStepIndex={setStepIndex} />
    </MemoryRouter>
  )
}

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({ headerComponent, setStepIndex }) => {
  const location = useLocation()
  const queryClient = useQueryClient()

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxClaimQuote | undefined>()
  const [claimTxid, setClaimTxid] = useState<string | undefined>()

  const { queryKey: unstakingRequestCountQueryKey } = useGetUnstakingRequestCountQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
  })

  const { queryKey: unstakingRequestQueryKey } = useGetUnstakingRequestsQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
  })

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: unstakingRequestCountQueryKey })
    await queryClient.invalidateQueries({ queryKey: unstakingRequestQueryKey })
  }, [queryClient, unstakingRequestCountQueryKey, unstakingRequestQueryKey])

  const renderClaimSelect = useCallback(() => {
    return (
      <ClaimSelect
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        setStepIndex={setStepIndex}
      />
    )
  }, [headerComponent, setStepIndex])

  const renderClaimConfirm = useCallback(() => {
    if (!confirmedQuote) return null

    return (
      <ClaimConfirm
        claimQuote={confirmedQuote}
        setClaimTxid={setClaimTxid}
        headerComponent={headerComponent}
        claimTxid={claimTxid}
      />
    )
  }, [claimTxid, confirmedQuote, headerComponent])

  const renderClaimStatus = useCallback(() => {
    if (!claimTxid) return null
    if (!confirmedQuote) return null

    return (
      <ClaimStatus
        accountId={confirmedQuote.stakingAssetAccountId}
        txId={claimTxid}
        onTxConfirmed={handleTxConfirmed}
        headerComponent={headerComponent}
        confirmedQuote={confirmedQuote}
      />
    )
  }, [claimTxid, confirmedQuote, handleTxConfirmed, headerComponent])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={ClaimRoutePaths.Select}
            path={ClaimRoutePaths.Select}
            render={renderClaimSelect}
          />
          <Route
            key={ClaimRoutePaths.Confirm}
            path={ClaimRoutePaths.Confirm}
            render={renderClaimConfirm}
          />
          <Route
            key={ClaimRoutePaths.Status}
            path={ClaimRoutePaths.Status}
            render={renderClaimStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
