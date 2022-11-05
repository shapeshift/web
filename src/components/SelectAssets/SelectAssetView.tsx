import type { Asset } from '@keepkey/asset-service'
import { useEffect } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { SelectAssetRoutes } from './SelectAssetCommon'
import type { SelectAssetLocation } from './SelectAssetRouter'
import { SelectAssets } from './SelectAssets'

type SelectAssetViewProps = {
  onClick: (asset: Asset) => void
  onBack?: () => void
} & SelectAssetLocation &
  RouteComponentProps

export const SelectAssetView = ({
  onClick,
  onBack: handleBack,
  toRoute,
  assetId,
}: SelectAssetViewProps) => {
  const location = useLocation<SelectAssetLocation>()
  const history = useHistory()

  useEffect(() => {
    if (toRoute && assetId) {
      history.push(toRoute, { assetId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Switch location={location} key={location.key}>
      <Route
        path={SelectAssetRoutes.Search}
        component={(props: RouteComponentProps) => (
          <SelectAssets onBack={handleBack} onClick={onClick} {...props} />
        )}
      />
      <Redirect from='/' to={SelectAssetRoutes.Search} />
    </Switch>
  )
}
