import { MemoryRouter, Route, Switch, useHistory } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { GetStarted } from './GetStarted'
import {
  GetStartedManagerProps,
  GetStartedManagerRoutes,
  GetStartedRouterProps,
} from './GetStartedCommon'
import { LearnMore } from './LearnMore'

export const entries = [GetStartedManagerRoutes.GetStarted, GetStartedManagerRoutes.LearnMore]

const GetStartedRouter = ({ assetId, onClose, stakingRouterHistory }: GetStartedRouterProps) => (
  <Switch>
    <Route path={GetStartedManagerRoutes.GetStarted}>
      <GetStarted assetId={assetId} stakingRouterHistory={stakingRouterHistory} />
    </Route>
    <Route path={GetStartedManagerRoutes.LearnMore}>
      <LearnMore assetId={assetId} onClose={onClose} />
    </Route>
  </Switch>
)

export const GetStartedManager = ({ assetId }: GetStartedManagerProps) => {
  const { cosmosStaking } = useModal()
  const history = useHistory()
  const { close } = cosmosStaking

  return (
    <MemoryRouter initialEntries={entries}>
      <GetStartedRouter assetId={assetId} onClose={close} stakingRouterHistory={history} />
    </MemoryRouter>
  )
}
