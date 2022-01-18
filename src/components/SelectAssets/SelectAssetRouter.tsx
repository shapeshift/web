import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { SelectAssetView } from './SelectAssetView'

export enum SelectAssetRoutes {
  Search = '/select/search',
  Account = '/select/account'
}

export const entries = [SelectAssetRoutes.Search, SelectAssetRoutes.Account]

type SelectAssetRouterProps = {
  onClick: (asset: Asset, accountId: AccountSpecifier) => void
} & RouteComponentProps

export type SelectAssetLocation = {
  toRoute: SelectAssetRoutes
  assetId: CAIP19
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
