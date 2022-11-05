import type { Asset } from '@keepkey/asset-service'
import type { AssetId } from '@keepkey/caip'
import type { RouteComponentProps } from 'react-router-dom'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'

import { SelectAssetRoutes } from './SelectAssetCommon'
import { SelectAssetView } from './SelectAssetView'

export const entries = [SelectAssetRoutes.Search]

type SelectAssetRouterProps = {
  onClick: (asset: Asset) => void
  onBack?: () => void
} & RouteComponentProps

export type SelectAssetLocation = {
  toRoute: SelectAssetRoutes
  assetId: AssetId
}

export const SelectAssetRouter = ({ onClick, onBack: handleBack }: SelectAssetRouterProps) => {
  const { state } = useLocation<SelectAssetLocation>()
  return (
    <MemoryRouter initialEntries={entries}>
      <Switch>
        <Route
          path='/'
          component={(props: RouteComponentProps) => (
            <SelectAssetView onClick={onClick} onBack={handleBack} {...state} {...props} />
          )}
        />
      </Switch>
    </MemoryRouter>
  )
}
