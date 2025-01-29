import { Redirect, Route, Switch, useHistory, useRouteMatch } from 'react-router'

import { Category } from './Category'
import { Recommended } from './Recommended'
import { WatchList } from './Watchlist'

export const MarketsPage = () => {
  const { path } = useRouteMatch()
  const history = useHistory()

  return (
    <Switch location={history.location}>
      <Route exact path={`${path}`}>
        <Redirect to={`${path}/recommended`} />
      </Route>
      <Route exact path={`${path}/recommended`}>
        <Recommended />
      </Route>
      <Route exact path={`${path}/watchlist`}>
        <WatchList />
      </Route>
      <Route exact path={`${path}/category/:category`}>
        <Category />
      </Route>
    </Switch>
  )
}
