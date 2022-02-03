import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route,  Routes, useLocation } from 'react-router-dom'
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
  const { state } = useLocation<SelectAssetLocation>()
  return (
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route path='/' element={<SelectAssetView onClick={onClick} {...state} />} />
      </Routes>
    </MemoryRouter>
  )
}
