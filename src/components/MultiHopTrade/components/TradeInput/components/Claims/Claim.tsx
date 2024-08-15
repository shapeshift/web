import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import { ClaimRoutePaths } from './types'

const ClaimSelect = makeSuspenseful(
  lazy(() =>
    import('./ClaimSelect').then(({ ClaimSelect }) => ({
      default: ClaimSelect,
    })),
  ),
)

const ClaimRouteEntries = [ClaimRoutePaths.Select, ClaimRoutePaths.Confirm, ClaimRoutePaths.Status]

export const Claim: React.FC = () => {
  const location = useLocation()

  return (
    <MemoryRouter initialEntries={ClaimRouteEntries} initialIndex={0}>
      <AnimatePresence mode='wait' initial={false}>
        <Switch location={location}>
          <Suspense>
            <Route
              key={ClaimRoutePaths.Select}
              path={ClaimRoutePaths.Select}
              render={ClaimSelect}
            />
            {/**
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
             */}
          </Suspense>
        </Switch>
      </AnimatePresence>
    </MemoryRouter>
  )
}
