import { useMemo } from 'react'
import type { RouteProps } from 'react-router-dom'
import { Redirect, Route, Switch } from 'react-router-dom'

type PrivateRouteProps = {
  hasWallet: boolean
} & RouteProps

export const PrivateRoute = ({ hasWallet, ...rest }: PrivateRouteProps) => {
  const { location } = rest

  const to = useMemo(
    () => ({
      pathname: '/connect-wallet',
      search: `returnUrl=${location?.pathname ?? '/trade'}`,
    }),
    [location],
  )

  return (
    <Switch location={location}>
      <Route {...rest} path='/markets' />
      <Route {...rest} path='/assets' />
      {hasWallet ? <Route {...rest} /> : <Redirect to={to} />}
    </Switch>
  )
}
