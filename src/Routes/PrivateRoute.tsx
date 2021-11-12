import { Redirect, Route, RouteProps } from 'react-router-dom'

type PrivateRouteProps = {
  isConnected: boolean
} & RouteProps

export const PrivateRoute = ({ isConnected, ...rest }: PrivateRouteProps) => {
  const { location } = rest
  return isConnected ? (
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
