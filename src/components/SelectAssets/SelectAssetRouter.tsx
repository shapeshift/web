import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId } from '@shapeshiftoss/caip'
import { MemoryRouter, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { SelectAssetRoutes } from './SelectAssetCommon'
import { SelectAssetView } from './SelectAssetView'

export const entries = [SelectAssetRoutes.Search, SelectAssetRoutes.Account]

type SelectAssetRouterProps = {
  onClick: (asset: Asset, accountId: AccountSpecifier) => void
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
