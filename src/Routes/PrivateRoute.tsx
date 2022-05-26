import { Redirect, Route, RouteProps } from 'react-router-dom'

type PrivateRouteProps = {
  hasWallet: boolean
} & RouteProps

export const PrivateRoute = ({ hasWallet, ...rest }: PrivateRouteProps) => {
  const { location } = rest

  return hasWallet ? (
    <Route {...rest} />
  ) : (
    <Redirect
      to={{
        pathname: '/connect-wallet',
        search: `returnUrl=${location?.pathname ?? '/dashboard'}`,
      }}
    />
  )
}
