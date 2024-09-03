import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

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

const ClaimRouteEntries = [ClaimRoutePaths.Select, ClaimRoutePaths.Confirm, ClaimRoutePaths.Status]

export const Claim: React.FC = () => {
  return (
    <MemoryRouter initialEntries={ClaimRouteEntries} initialIndex={0}>
      <ClaimRoutes />
    </MemoryRouter>
  )
}

export const ClaimRoutes: React.FC = () => {
  const location = useLocation()

  const [activeClaim, setActiveClaim] = useState<ClaimDetails | undefined>()
  const [claimTxHash, setClaimTxHash] = useState<string | undefined>()
  const [claimTxStatus, setClaimTxStatus] = useState<TxStatus | undefined>()

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect setActiveClaim={setActiveClaim} />
  }, [])

  const renderClaimConfirm = useCallback(() => {
    if (!activeClaim) return null

    return (
      <ClaimConfirm
        activeClaim={activeClaim}
        setClaimTxHash={setClaimTxHash}
        setClaimTxStatus={setClaimTxStatus}
      />
    )
  }, [activeClaim, setClaimTxHash, setClaimTxStatus])

  const renderClaimStatus = useCallback(() => {
    if (!activeClaim) return null
    if (!claimTxHash) return null
    if (!claimTxStatus) return null

    return (
      <ClaimStatus
        activeClaim={activeClaim}
        claimTxHash={claimTxHash}
        claimTxStatus={claimTxStatus}
      />
    )
  }, [activeClaim, claimTxHash, claimTxStatus])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense>
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
