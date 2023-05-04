import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { SelectAssetRoutes } from './SelectAssetCommon'
import type { SelectAssetLocation } from './SelectAssetRouter'
import { SelectAssets } from './SelectAssets'

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
      <Redirect from='/' to={SelectAssetRoutes.Search} />
    </Switch>
  )
}
