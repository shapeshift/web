import { lazy, useCallback } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute, TransactionStatus } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const StakeInput = makeSuspenseful(
  lazy(() =>
    import('./StakeInput').then(({ StakeInput }) => ({
      default: StakeInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./StakeConfirm').then(({ StakeConfirm }) => ({
      default: StakeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeStatus = makeSuspenseful(
  lazy(() =>
    import('./StakeStatus').then(({ StakeStatus }) => ({
      default: StakeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeEntries = [TCYStakeRoute.Input, TCYStakeRoute.Confirm, TCYStakeRoute.Status]

export const Stake: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const renderStakeInput = useCallback(() => {
    return <StakeInput headerComponent={headerComponent} />
  }, [headerComponent])

  const renderStakeConfirm = useCallback(() => {
    return <StakeConfirm />
  }, [])

  const renderStakeStatus = useCallback(() => {
    return <StakeStatus status={TransactionStatus.Pending} />
  }, [])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYStakeRoute.Input}>{renderStakeInput()}</Route>
        <Route path={TCYStakeRoute.Confirm}>{renderStakeConfirm()}</Route>
        <Route path={TCYStakeRoute.Status}>{renderStakeStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
