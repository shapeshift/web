import { Route, RouteProps } from 'react-router-dom'

export const PrivateRoute = ({ ...props }: RouteProps) => {
  return <Route {...props} />
}
