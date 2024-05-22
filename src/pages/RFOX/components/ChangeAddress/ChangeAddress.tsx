import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import type { ChangeAddressRouteProps } from './types'
import { ChangeAddressRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const ChangeAddressInput = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressInput').then(({ ChangeAddressInput }) => ({
      default: ChangeAddressInput,
    })),
  ),
)

const ChangeAddressConfirm = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressConfirm').then(({ ChangeAddressConfirm }) => ({
      default: ChangeAddressConfirm,
    })),
  ),
)

const ChangeAddressStatus = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressStatus').then(({ ChangeAddressStatus }) => ({
      default: ChangeAddressStatus,
    })),
  ),
)

const ChangeAddressEntries = [
  ChangeAddressRoutePaths.Input,
  ChangeAddressRoutePaths.Confirm,
  ChangeAddressRoutePaths.Status,
]

export const ChangeAddress: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={ChangeAddressEntries} initialIndex={0}>
      <ChangeAddressRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const ChangeAddressRoutes: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const [newRuneAddress, setNewRuneAddress] = useState<string | undefined>()

  const renderChangeAddressInput = useCallback(() => {
    return (
      <ChangeAddressInput
        newRuneAddress={newRuneAddress}
        onNewRuneAddressChange={setNewRuneAddress}
        headerComponent={headerComponent}
      />
    )
  }, [headerComponent, newRuneAddress])

  const renderChangeAddressConfirm = useCallback(() => {
    return <ChangeAddressConfirm headerComponent={headerComponent} />
  }, [headerComponent])

  const renderChangeAddressStatus = useCallback(() => {
    return <ChangeAddressStatus headerComponent={headerComponent} />
  }, [headerComponent])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={ChangeAddressRoutePaths.Input}
            path={ChangeAddressRoutePaths.Input}
            render={renderChangeAddressInput}
          />
          <Route
            key={ChangeAddressRoutePaths.Confirm}
            path={ChangeAddressRoutePaths.Confirm}
            render={renderChangeAddressConfirm}
          />
          <Route
            key={ChangeAddressRoutePaths.Status}
            path={ChangeAddressRoutePaths.Status}
            render={renderChangeAddressStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
