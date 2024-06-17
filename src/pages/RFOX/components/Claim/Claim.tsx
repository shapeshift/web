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

export const Claim: React.FC<ClaimRouteProps> = ({
  headerComponent,
  initialIndex = 0,
  setStepIndex,
  confirmedQuote,
}) => {
  return (
    <MemoryRouter initialEntries={ClaimEntries} initialIndex={initialIndex}>
      <ClaimRoutes
        headerComponent={headerComponent}
        setStepIndex={setStepIndex}
        confirmedQuote={confirmedQuote}
      />
    </MemoryRouter>
  )
}

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({
  confirmedQuote: _confirmedQuote,
  headerComponent,
  setStepIndex,
  confirmedQuote,
  setConfirmedQuote,
}) => {
  const location = useLocation()

  const [claimTxid, setClaimTxid] = useState<string | undefined>()

  const renderClaimSelect = useCallback(() => {
    if (!setConfirmedQuote) return null

    return (
      <ClaimSelect
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        setStepIndex={setStepIndex}
      />
    )
  }, [headerComponent, setConfirmedQuote, setStepIndex])

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
        txId={claimTxid}
        headerComponent={headerComponent}
        confirmedQuote={confirmedQuote}
      />
    )
  }, [confirmedQuote, claimTxid, headerComponent])

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
