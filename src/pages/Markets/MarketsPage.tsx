import { Redirect, Route, Switch, useRouteMatch } from 'react-router'

import { Category } from './Category'
import { Recommended } from './Recommended'

export const MarketsPage = () => {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route exact path={`${path}`}>
        <Redirect to={`${path}/recommended`} />
      </Route>
      <Route exact path={`${path}/recommended`}>
        <Recommended />
      </Route>
      <Route exact path={`${path}/category/:category`}>
        <Category />
      </Route>
      <Route path={`${path}/watchlist`}></Route>
    </Switch>
  )
}
