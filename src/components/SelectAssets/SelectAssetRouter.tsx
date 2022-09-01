import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId } from '@shapeshiftoss/caip'
import { MemoryRouter, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'

import { SelectAssetRoutes } from './SelectAssetCommon'
import { SelectAssetView } from './SelectAssetView'

export const entries = [SelectAssetRoutes.Search]

type SelectAssetRouterProps = {
  onClick: (asset: Asset) => void
} & RouteComponentProps

export type SelectAssetLocation = {
  toRoute: SelectAssetRoutes
  assetId: AssetId
}

export const SelectAssetRouter = ({ onClick }: SelectAssetRouterProps) => {
  const { state } = useLocation<SelectAssetLocation>()
  return (
    <MemoryRouter initialEntries={entries}>
      <Switch>
        <Route
          path='/'
          component={(props: RouteComponentProps) => (
            <SelectAssetView onClick={onClick} {...state} {...props} />
          )}
        />
      </Switch>
    </MemoryRouter>
  )
}
