import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { SelectAssetView } from './SelectAssetView'

export enum SelectAssetRoutes {
  Search = '/select/search',
  Account = '/select/account'
}

export const entries = [SelectAssetRoutes.Search, SelectAssetRoutes.Account]

type SelectAssetRouterProps = {
  onClick: (asset: Asset, accountId: AccountSpecifier) => void
}

export type SelectAssetLocation = {
  toRoute: SelectAssetRoutes
  assetId: CAIP19
}

export const SelectAssetRouter = ({ onClick }: SelectAssetRouterProps) => {
  const { toRoute, assetId }: any = useParams()
  return (
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route
          path='/'
          element={<SelectAssetView onClick={onClick} toRoute={toRoute} assetId={assetId} />}
        />
      </Routes>
    </MemoryRouter>
  )
}
