import { Redirect, Route, RouteProps } from 'react-router-dom'

type PrivateRouteProps = {
  isConnected: boolean
} & RouteProps

export const PrivateRoute = ({ isConnected, ...rest }: PrivateRouteProps) => {
  return isConnected ? <Route {...rest} /> : <Redirect to='/connect-wallet' />
}
