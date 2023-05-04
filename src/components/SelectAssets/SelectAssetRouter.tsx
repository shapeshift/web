import type { AssetId } from '@shapeshiftoss/caip'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { SelectAssetRoutes } from './SelectAssetCommon'
import { SelectAssetView } from './SelectAssetView'

export const entries = [SelectAssetRoutes.Search]

type SelectAssetRouterProps = {
  onClick: (assetId: AssetId) => void
  onBack?: () => void
}

export type SelectAssetLocation = {
  toRoute: SelectAssetRoutes
  assetId: AssetId
}

export const SelectAssetRouter = ({ onClick, onBack: handleBack }: SelectAssetRouterProps) => {
  const { state } = useLocation<SelectAssetLocation>()
  return (
    <MemoryRouter initialEntries={entries}>
      <SelectAssetView onClick={onClick} onBack={handleBack} {...state} />
    </MemoryRouter>
  )
}
