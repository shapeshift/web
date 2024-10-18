import { useMemo } from 'react'
import type { RouteProps } from 'react-router-dom'
import { Redirect, Route, Switch } from 'react-router-dom'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

type PrivateRouteProps = {
  hasWallet: boolean
} & RouteProps

export const PrivateRoute = ({ hasWallet, ...rest }: PrivateRouteProps) => {
  const { location } = rest

  const isPublicTradeRouteEnabled = useFeatureFlag('PublicTradeRoute')

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
      <Route {...rest} path='/rfox' />
      <Route {...rest} path='/explore' />
      <Route {...rest} path='/pools' />
      <Route {...rest} path='/earn' />
      <Route {...rest} path='/buy-crypto' />
      <Route {...rest} path='/assets' />
      <Route {...rest} path='/flags' />
      <Route {...rest} path='/fox' />
      {isPublicTradeRouteEnabled ? <Route {...rest} path='/trade' /> : null}
      {hasWallet ? <Route {...rest} /> : <Redirect to={to} />}
    </Switch>
  )
}
