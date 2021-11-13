import { getConfig } from 'config'
import { Redirect, Route, RouteProps } from 'react-router-dom'

type PrivateRouteProps = {
  isConnected: boolean
} & RouteProps

const HIDE_SPLASH = getConfig().REACT_APP_HIDE_SPLASH

export const PrivateRoute = ({ isConnected, ...rest }: PrivateRouteProps) => {
  const { location } = rest

  return isConnected || HIDE_SPLASH ? (
    <Route {...rest} />
  ) : (
    <Redirect
      to={{
        pathname: '/connect-wallet',
        search: `returnUrl=${location?.pathname ?? '/dashboard'}`
      }}
    />
  )
}
