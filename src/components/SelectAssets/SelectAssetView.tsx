import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

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
  const navigate = useNavigate()

  useEffect(() => {
    if (toRoute && assetId) {
      navigate(toRoute, { state: { assetId } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const searchRoute = useMemo(
    () => (
      <Route
        path={SelectAssetRoutes.Search}
        // This is already within a useMemo call, lint rule drunk
      >
        {<SelectAssets onBack={handleBack} onClick={onClick} />}
      </Route>
    ),
    [handleBack, onClick],
  )

  const redirectRoute = useMemo(
    () => (
      <Route path='/'>
        <SelectAssets onBack={handleBack} onClick={onClick} />
      </Route>
    ),
    [handleBack, onClick],
  )

  return (
    <Switch>
      {searchRoute}
      {redirectRoute}
    </Switch>
  )
}
