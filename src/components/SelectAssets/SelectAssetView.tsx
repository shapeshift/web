import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { SelectAssetRoutes } from './SelectAssetCommon'
import type { SelectAssetLocation } from './SelectAssetRouter'
import { SelectAssets } from './SelectAssets'

const searchRedirect = () => <Redirect to={SelectAssetRoutes.Search} />
type SelectAssetViewProps = {
  onClick: (assetId: AssetId) => void
  onBack?: () => void
} & SelectAssetLocation

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
      <Route path={SelectAssetRoutes.Search}>
        <SelectAssets onBack={handleBack} onClick={onClick} />
      </Route>
      <Route path='/' render={searchRedirect} />
    </Switch>
  )
}
