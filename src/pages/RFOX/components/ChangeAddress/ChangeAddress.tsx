import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useMemo } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import type { ChangeAddressRouteProps } from './types'
import { ChangeAddressRoutePaths } from './types'
import type { TextPropTypes } from 'components/Text/Text'

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
    import('../Status').then(({ Status }) => ({
      default: Status,
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
      <StakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  const location = useLocation()
  const history = useHistory()

  const renderChangeAddressInput = useCallback(() => {
    return <ChangeAddressInput headerComponent={headerComponent} />
  }, [headerComponent])

  const renderChangeAddressConfirm = useCallback(() => {
    return <ChangeAddressConfirm headerComponent={headerComponent} />
  }, [headerComponent])

  const pendingBody: TextPropTypes['translation'] = useMemo(
    () => ['RFOX.unstakePending', { amount: '1,500', symbol: 'FOX' }],
    [],
  )
  const confirmedBody: TextPropTypes['translation'] = useMemo(
    () => ['RFOX.unstakeSuccess', { amount: '1,500', symbol: 'FOX' }],
    [],
  )

  const handleBack = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Input)
  }, [history])

  const renderChangeAddressStatus = useCallback(() => {
    return (
      <ChangeAddressStatus
        headerComponent={headerComponent}
        pendingBody={pendingBody}
        confirmedBody={confirmedBody}
        onBack={handleBack}
      />
    )
  }, [confirmedBody, handleBack, headerComponent, pendingBody])

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
