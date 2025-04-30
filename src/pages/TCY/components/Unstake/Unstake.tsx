import { lazy, useCallback } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import type { TCYRouteProps } from '../../types'
import { TCYUnstakeRoute, TransactionStatus } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const UnstakeInput = makeSuspenseful(
  lazy(() =>
    import('./UnstakeInput').then(({ UnstakeInput }) => ({
      default: UnstakeInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./UnstakeConfirm').then(({ UnstakeConfirm }) => ({
      default: UnstakeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeStatus = makeSuspenseful(
  lazy(() =>
    import('./UnstakeStatus').then(({ UnstakeStatus }) => ({
      default: UnstakeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeEntries = [TCYUnstakeRoute.Input, TCYUnstakeRoute.Confirm, TCYUnstakeRoute.Status]

export const Unstake: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={UnstakeEntries} initialIndex={0}>
      <UnstakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const UnstakeRoutes: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const renderUnstakeInput = useCallback(() => {
    return <UnstakeInput headerComponent={headerComponent} />
  }, [headerComponent])

  const renderUnstakeConfirm = useCallback(() => {
    return <UnstakeConfirm />
  }, [])

  const renderUnstakeStatus = useCallback(() => {
    return <UnstakeStatus status={TransactionStatus.Success} />
  }, [])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYUnstakeRoute.Input}>{renderUnstakeInput()}</Route>
        <Route path={TCYUnstakeRoute.Confirm}>{renderUnstakeConfirm()}</Route>
        <Route path={TCYUnstakeRoute.Status}>{renderUnstakeStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
