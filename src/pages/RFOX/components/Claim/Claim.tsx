import { fromAccountId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import type { ClaimRouteProps, RfoxClaimQuote } from './types'

import { getUnstakingRequestCountQueryKey } from '@/pages/RFOX/hooks/useGetUnstakingRequestCountQuery'
import { useGetUnstakingRequestsQuery } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const suspenseFallback = <div>Loading...</div>

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const ClaimSelect = makeSuspenseful(
  lazy(() =>
    import('./ClaimSelect').then(({ ClaimSelect }) => ({
      default: ClaimSelect,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const ClaimConfirm = makeSuspenseful(
  lazy(() =>
    import('./ClaimConfirm').then(({ ClaimConfirm }) => ({
      default: ClaimConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const ClaimStatus = makeSuspenseful(
  lazy(() =>
    import('./ClaimStatus').then(({ ClaimStatus }) => ({
      default: ClaimStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

export const Claim: React.FC<ClaimRouteProps> = ({ headerComponent, setStepIndex }) => {
  return <ClaimRoutes headerComponent={headerComponent} setStepIndex={setStepIndex} />
}

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({ headerComponent, setStepIndex }) => {
  const location = useLocation()
  const queryClient = useQueryClient()

  const [claimTxid, setClaimTxid] = useState<string | undefined>()

  const confirmedQuote = location.state?.confirmedQuote as RfoxClaimQuote | undefined

  const stakingAssetAccountAddress = useMemo(() => {
    return confirmedQuote ? fromAccountId(confirmedQuote.stakingAssetAccountId).account : undefined
  }, [confirmedQuote])

  const { queryKey: unstakingRequestQueryKey } = useGetUnstakingRequestsQuery({
    stakingAssetAccountAddress,
  })

  const handleTxConfirmed = useCallback(async () => {
    if (!confirmedQuote) return

    await queryClient.invalidateQueries({
      queryKey: getUnstakingRequestCountQueryKey({
        stakingAssetId: confirmedQuote.stakingAssetId,
        stakingAssetAccountAddress,
      }),
    })
    await queryClient.invalidateQueries({ queryKey: unstakingRequestQueryKey })
  }, [confirmedQuote, queryClient, unstakingRequestQueryKey, stakingAssetAccountAddress])

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect headerComponent={headerComponent} setStepIndex={setStepIndex} />
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
        setClaimTxid={setClaimTxid}
        onTxConfirmed={handleTxConfirmed}
        headerComponent={headerComponent}
        confirmedQuote={confirmedQuote}
      />
    )
  }, [claimTxid, handleTxConfirmed, headerComponent, confirmedQuote])

  const renderRedirect = useCallback(() => <Navigate to='' replace />, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        <Routes>
          <Route path='' element={renderClaimSelect()} />
          <Route path=':claimId/confirm' element={renderClaimConfirm()} />
          <Route path=':claimId/status' element={renderClaimStatus()} />
          <Route path='*' element={renderRedirect()} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}
