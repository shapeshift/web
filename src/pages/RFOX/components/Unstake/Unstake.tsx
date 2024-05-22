import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useMemo } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import type { TextPropTypes } from 'components/Text/Text'

import type { UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const UnstakeInput = makeSuspenseful(
  lazy(() =>
    import('./UnstakeInput').then(({ UnstakeInput }) => ({
      default: UnstakeInput,
    })),
  ),
)

const UnstakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./UnstakeConfirm').then(({ UnstakeConfirm }) => ({
      default: UnstakeConfirm,
    })),
  ),
)

const UnstakeStatus = makeSuspenseful(
  lazy(() =>
    import('../Status').then(({ Status }) => ({
      default: Status,
    })),
  ),
)

const UnstakeEntries = [
  UnstakeRoutePaths.Input,
  UnstakeRoutePaths.Confirm,
  UnstakeRoutePaths.Status,
]

export const Unstake: React.FC<UnstakeRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={UnstakeEntries} initialIndex={0}>
      <UnstakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const UnstakeRoutes: React.FC<UnstakeRouteProps> = ({ headerComponent }) => {
  const location = useLocation()
  const history = useHistory()

  const renderUnstakeInput = useCallback(() => {
    return <UnstakeInput headerComponent={headerComponent} />
  }, [headerComponent])

  const renderUnstakeConfirm = useCallback(() => {
    return <UnstakeConfirm headerComponent={headerComponent} />
  }, [headerComponent])

  const pendingBody: TextPropTypes['translation'] = useMemo(
    () => 'RFOX.addressUpdateActionPending',
    [],
  )
  const confirmedBody: TextPropTypes['translation'] = useMemo(() => 'RFOX.addressUpdateSucces', [])

  const handleBack = useCallback(() => {
    history.push(UnstakeRoutePaths.Input)
  }, [history])

  const renderUnstakeStatus = useCallback(() => {
    return (
      <UnstakeStatus
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
            key={UnstakeRoutePaths.Input}
            path={UnstakeRoutePaths.Input}
            render={renderUnstakeInput}
          />
          <Route
            key={UnstakeRoutePaths.Confirm}
            path={UnstakeRoutePaths.Confirm}
            render={renderUnstakeConfirm}
          />
          <Route
            key={UnstakeRoutePaths.Status}
            path={UnstakeRoutePaths.Status}
            render={renderUnstakeStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
