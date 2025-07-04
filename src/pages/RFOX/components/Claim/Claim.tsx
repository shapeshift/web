import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import type { ClaimRouteProps } from './types'

import { getUnstakingRequestCountQueryKey } from '@/pages/RFOX/hooks/useGetUnstakingRequestCountQuery'
import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery'
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

  const selectedUnstakingRequest = location.state?.selectedUnstakingRequest as
    | UnstakingRequest
    | undefined

  const { queryKey: unstakingRequestQueryKey } = useGetUnstakingRequestsQuery({
    stakingAssetAccountId: selectedUnstakingRequest?.stakingAssetAccountId,
  })

  const handleTxConfirmed = useCallback(async () => {
    if (!selectedUnstakingRequest) return

    await queryClient.invalidateQueries({
      queryKey: getUnstakingRequestCountQueryKey({
        stakingAssetId: selectedUnstakingRequest.stakingAssetId,
        stakingAssetAccountId: selectedUnstakingRequest?.stakingAssetAccountId,
      }),
    })
    await queryClient.invalidateQueries({ queryKey: unstakingRequestQueryKey })
  }, [selectedUnstakingRequest, queryClient, unstakingRequestQueryKey])

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect headerComponent={headerComponent} setStepIndex={setStepIndex} />
  }, [headerComponent, setStepIndex])

  const renderClaimConfirm = useCallback(() => {
    if (!selectedUnstakingRequest) return null

    return (
      <ClaimConfirm
        selectedUnstakingRequest={selectedUnstakingRequest}
        setClaimTxid={setClaimTxid}
        headerComponent={headerComponent}
        claimTxid={claimTxid}
      />
    )
  }, [claimTxid, selectedUnstakingRequest, headerComponent])

  const renderClaimStatus = useCallback(() => {
    if (!claimTxid) return null
    if (!selectedUnstakingRequest) return null

    return (
      <ClaimStatus
        accountId={selectedUnstakingRequest.stakingAssetAccountId}
        txId={claimTxid}
        setClaimTxid={setClaimTxid}
        onTxConfirmed={handleTxConfirmed}
        headerComponent={headerComponent}
        selectedUnstakingRequest={selectedUnstakingRequest}
      />
    )
  }, [claimTxid, handleTxConfirmed, headerComponent, selectedUnstakingRequest])

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
