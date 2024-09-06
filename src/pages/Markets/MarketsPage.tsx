import { Redirect, Route, Switch, useRouteMatch } from 'react-router'

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
      <Route path={`${path}/watchlist`}></Route>
      <Route path={`${path}/categories`}></Route>
    </Switch>
  )
}
