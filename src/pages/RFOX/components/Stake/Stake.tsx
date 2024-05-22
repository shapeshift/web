import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useMemo } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import type { TextPropTypes } from 'components/Text/Text'

import type { StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const StakeInput = makeSuspenseful(
  lazy(() =>
    import('./StakeInput').then(({ StakeInput }) => ({
      default: StakeInput,
    })),
  ),
)

const StakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./StakeConfirm').then(({ StakeConfirm }) => ({
      default: StakeConfirm,
    })),
  ),
)

const StakeStatus = makeSuspenseful(
  lazy(() =>
    import('../Status').then(({ Status }) => ({
      default: Status,
    })),
  ),
)

const StakeEntries = [StakeRoutePaths.Input, StakeRoutePaths.Confirm, StakeRoutePaths.Status]

export const Stake: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  const location = useLocation()
  const history = useHistory()

  const renderStakeInput = useCallback(() => {
    return <StakeInput headerComponent={headerComponent} />
  }, [headerComponent])

  const renderStakeConfirm = useCallback(() => {
    return <StakeConfirm headerComponent={headerComponent} />
  }, [headerComponent])

  const pendingBody: TextPropTypes['translation'] = useMemo(
    () => ['RFOX.stakePending', { amount: '1,500', symbol: 'FOX' }],
    [],
  )
  const confirmedBody: TextPropTypes['translation'] = useMemo(
    () => ['RFOX.stakeSuccess', { amount: '1,500', symbol: 'FOX' }],
    [],
  )

  const handleBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const renderStakeStatus = useCallback(() => {
    return (
      <StakeStatus
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
            key={StakeRoutePaths.Input}
            path={StakeRoutePaths.Input}
            render={renderStakeInput}
          />
          <Route
            key={StakeRoutePaths.Confirm}
            path={StakeRoutePaths.Confirm}
            render={renderStakeConfirm}
          />
          <Route
            key={StakeRoutePaths.Status}
            path={StakeRoutePaths.Status}
            render={renderStakeStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
