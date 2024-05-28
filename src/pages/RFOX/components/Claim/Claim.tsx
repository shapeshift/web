import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

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

export const Claim: React.FC<ClaimRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={ClaimEntries} initialIndex={0}>
      <ClaimRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const [claimTxid, setClaimTxid] = useState<string | undefined>()

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect headerComponent={headerComponent} />
  }, [headerComponent])

  const renderClaimConfirm = useCallback(() => {
    return (
      <ClaimConfirm
        claimTxid={claimTxid}
        setClaimTxid={setClaimTxid}
        headerComponent={headerComponent}
      />
    )
  }, [claimTxid, headerComponent])

  const renderClaimStatus = useCallback(() => {
    return <ClaimStatus txId={claimTxid} headerComponent={headerComponent} />
  }, [claimTxid, headerComponent])

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
