import { lazy, useCallback } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import type { TCYRouteProps } from '../../types'
import { TCYClaimRoute, TransactionStatus } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const ClaimSelect = makeSuspenseful(
  lazy(() =>
    import('./ClaimSelect').then(({ ClaimSelect }) => ({
      default: ClaimSelect,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const ClaimConfirm = makeSuspenseful(
  lazy(() =>
    import('./ClaimConfirm').then(({ ClaimConfirm }) => ({
      default: ClaimConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const ClaimStatus = makeSuspenseful(
  lazy(() =>
    import('./ClaimStatus').then(({ ClaimStatus }) => ({
      default: ClaimStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)
const ClaimEntries = [TCYClaimRoute.Select]

export const Claim: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={ClaimEntries} initialIndex={0}>
      <ClaimRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const ClaimRoutes: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect headerComponent={headerComponent} />
  }, [headerComponent])

  const renderClaimConfirm = useCallback(() => {
    return <ClaimConfirm />
  }, [])

  const renderClaimStatus = useCallback(() => {
    return <ClaimStatus status={TransactionStatus.Success} />
  }, [])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYClaimRoute.Select}>{renderClaimSelect()}</Route>
        <Route path={TCYClaimRoute.Confirm}>{renderClaimConfirm()}</Route>
        <Route path={TCYClaimRoute.Status}>{renderClaimStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
