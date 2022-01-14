import { CAIP19 } from '@shapeshiftoss/caip'
import { MemoryRouter, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'

import { SelectAssetView } from './SelectAssetView'

export enum SelectAssetRoutes {
  Search = '/select/search',
  Account = '/select/account'
}

export const entries = [SelectAssetRoutes.Search, SelectAssetRoutes.Account]

type SelectAssetRouterProps = {
  onClick: (asset: any) => void
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
          component={(props: RouteComponentProps) => <SelectAssetView {...state} {...props} />}
        />
      </Switch>
    </MemoryRouter>
  )
}
