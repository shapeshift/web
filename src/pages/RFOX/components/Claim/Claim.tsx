import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import type { ClaimRouteProps } from './types'
import { ClaimRoutePaths } from './types'

import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'
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

export const Claim: React.FC<ClaimRouteProps> = ({ headerComponent, setStepIndex }) => {
  return <ClaimRoutes headerComponent={headerComponent} setStepIndex={setStepIndex} />
}

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({ headerComponent, setStepIndex }) => {
  const location = useLocation()

  const [claimTxid, setClaimTxid] = useState<string | undefined>()

  const selectedUnstakingRequest = location.state?.selectedUnstakingRequest as
    | UnstakingRequest
    | undefined

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

  const renderRedirect = useCallback(() => <Navigate to='' replace />, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        <Routes>
          <Route path={ClaimRoutePaths.Select} element={renderClaimSelect()} />
          <Route path={ClaimRoutePaths.Confirm} element={renderClaimConfirm()} />
          <Route path='*' element={renderRedirect()} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}
