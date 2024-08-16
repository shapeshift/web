import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useCallback } from 'react'
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
  return (
    <MemoryRouter initialEntries={ClaimRouteEntries} initialIndex={0}>
      <ClaimRoutes />
    </MemoryRouter>
  )
}

export const ClaimRoutes: React.FC = () => {
  const location = useLocation()

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect />
  }, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense>
          <Route
            key={ClaimRoutePaths.Select}
            path={ClaimRoutePaths.Select}
            render={renderClaimSelect}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
