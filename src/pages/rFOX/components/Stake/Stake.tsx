import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

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
    import('./StakeStatus').then(({ StakeStatus }) => ({
      default: StakeStatus,
    })),
  ),
)

const StakeEntries = [StakeRoutePaths.Input, StakeRoutePaths.Confirm, StakeRoutePaths.Status]

export const Stake = () => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes />
    </MemoryRouter>
  )
}

export const StakeRoutes = () => {
  const location = useLocation()

  const renderStakeInput = useCallback(() => {
    return <StakeInput />
  }, [])

  const renderStakeConfirm = useCallback(() => {
    return <StakeConfirm />
  }, [])

  const renderStakeStatus = useCallback(() => {
    return <StakeStatus />
  }, [])

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
