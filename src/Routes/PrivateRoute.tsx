import { getConfig } from 'config'
import { Navigate,  Route, RouteProps } from 'react-router-dom'

type PrivateRouteProps = {
  hasWallet: boolean
} & RouteProps

const HIDE_SPLASH = getConfig().REACT_APP_HIDE_SPLASH

export const PrivateRoute = ({ hasWallet, ...rest }: PrivateRouteProps) => {
  const { location } = rest

  return hasWallet || HIDE_SPLASH ? (
    <Route {...rest} />
  ) : (
    <Navigate
      to={{
        pathname: '/connect-wallet',
        search: `returnUrl=${location?.pathname ?? '/dashboard'}`
      }}
    />
  )
}
