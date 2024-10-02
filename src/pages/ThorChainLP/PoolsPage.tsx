import { lazy } from 'react'
import { Route, Switch, useRouteMatch } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

const AvailablePools = makeSuspenseful(
  lazy(() =>
    import('./AvailablePools').then(({ AvailablePools }) => ({ default: AvailablePools })),
  ),
)
const Pool = makeSuspenseful(
  lazy(() => import('./Pool/Pool').then(({ Pool }) => ({ default: Pool }))),
)

const YourPositions = makeSuspenseful(
  lazy(() => import('./YourPositions').then(({ YourPositions }) => ({ default: YourPositions }))),
)

const Position = makeSuspenseful(
  lazy(() => import('./Position/Position').then(({ Position }) => ({ default: Position }))),
)

const AddLiquidityPage = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityPage').then(({ AddLiquidityPage }) => ({ default: AddLiquidityPage })),
  ),
)

export const PoolsPage = () => {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route exact path={`${path}`}>
        <AvailablePools />
      </Route>
      <Route exact path={`${path}/positions`}>
        <YourPositions />
      </Route>
      <Route path={`${path}/positions/:poolAssetId/:accountId/:opportunityId`}>
        <Position />
      </Route>
      <Route path={`${path}/add/:poolAssetId?/:opportunityId?`}>
        <AddLiquidityPage />
      </Route>
      <Route path={`${path}/:poolAssetId`}>
        <Pool />
      </Route>
    </Switch>
  )
}
