import { useEffect } from 'react'
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation
} from 'react-router-dom'

import { SelectAccount } from './SelectAccount'
import { SelectAssetLocation, SelectAssetRoutes } from './SelectAssetRouter'
import { SelectAssets } from './SelectAssets'

type SelectAssetViewProps = SelectAssetLocation & RouteComponentProps

export const SelectAssetView = ({ toRoute, assetId }: SelectAssetViewProps) => {
  const location = useLocation<SelectAssetLocation>()
  const history = useHistory()

  const handleAssetSelect = () => {
    //Logic to handle if we need to fire onClick on take to select account route
    history.push(SelectAssetRoutes.Account)
  }

  useEffect(() => {
    if (toRoute && assetId) {
      history.push(toRoute, { assetId })
    }
  }, [assetId, history, toRoute])

  return (
    <Switch location={location} key={location.key}>
      <Route
        path={SelectAssetRoutes.Search}
        component={(props: RouteComponentProps) => (
          <SelectAssets onClick={handleAssetSelect} {...props} />
        )}
      />
      <Route
        path={SelectAssetRoutes.Account}
        component={(props: RouteComponentProps) => (
          <SelectAccount onClick={handleAssetSelect} {...props} />
        )}
      />
      <Redirect from='/' to={SelectAssetRoutes.Search} />
    </Switch>
  )
}
