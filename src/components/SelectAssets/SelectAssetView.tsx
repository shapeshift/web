import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useMemo } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { SelectAssetRoutes } from './SelectAssetCommon'
import type { SelectAssetLocation } from './SelectAssetRouter'
import { SelectAssets } from './SelectAssets'

const searchRedirect = <Navigate to={SelectAssetRoutes.Search} replace />

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
        element={<SelectAssets onBack={handleBack} onClick={onClick} />}
      />
    ),
    [handleBack, onClick],
  )

  const redirectRoute = useMemo(() => <Route path='/' element={searchRedirect} />, [])

  return (
    <Routes>
      {searchRoute}
      {redirectRoute}
    </Routes>
  )
}
