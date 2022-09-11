import { MemoryRouter, Route, Switch, useHistory } from 'react-router-dom'

import { GetStarted } from './GetStarted'
import type { GetStartedManagerProps, GetStartedRouterProps } from './GetStartedCommon'
import { GetStartedManagerRoutes } from './GetStartedCommon'
import { LearnMore } from './LearnMore'

export const entries = [GetStartedManagerRoutes.GetStarted, GetStartedManagerRoutes.LearnMore]

const GetStartedRouter = ({ assetId, stakingRouterHistory }: GetStartedRouterProps) => (
  <Switch>
    <Route path={GetStartedManagerRoutes.GetStarted}>
      <GetStarted assetId={assetId} stakingRouterHistory={stakingRouterHistory} />
    </Route>
    <Route path={GetStartedManagerRoutes.LearnMore}>
      <LearnMore assetId={assetId} />
    </Route>
  </Switch>
)

export const GetStartedManager = ({ assetId }: GetStartedManagerProps) => {
  const history = useHistory()

  return (
    <MemoryRouter initialEntries={entries}>
      <GetStartedRouter assetId={assetId} stakingRouterHistory={history} />
    </MemoryRouter>
  )
}
