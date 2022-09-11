import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { RouteComponentProps } from 'react-router-dom'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

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
