import { Asset } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import {
  Route,
  
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioAccounts } from 'state/slices/portfolioSlice/selectors'
import { findAccountsByAssetId } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'

import { SelectAccount } from './SelectAccount'
import { SelectAssetLocation, SelectAssetRoutes } from './SelectAssetRouter'
import { SelectAssets } from './SelectAssets'

type SelectAssetViewProps = {
  onClick: (asset: Asset, accountId: AccountSpecifier) => void
} & SelectAssetLocation 
export const SelectAssetView = ({ onClick, toRoute, assetId }: SelectAssetViewProps) => {
  const location = useLocation()
  const navigate = useNavigate()

  const accounts = useAppSelector(state => selectPortfolioAccounts(state))

  const handleAssetSelect = (asset: Asset) => {
    const assetAccounts = findAccountsByAssetId(accounts, asset.caip19)
    if (assetAccounts && assetAccounts.length > 1) {
      navigate(SelectAssetRoutes.Account, {state: { assetId: asset.caip19 }})
    } else {
      handleAccountSelect(asset, assetAccounts[0])
    }
  }
  const handleAccountSelect = (asset: Asset, accountId: AccountSpecifier) => {
    onClick(asset, accountId)
  }

  useEffect(() => {
    if (toRoute && assetId) {
      navigate(toRoute, { assetId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Routes location={location} key={location.key}>
      <Route
        path={SelectAssetRoutes.Search}
        element={
          <SelectAssets onClick={handleAssetSelect}  />
        }
      />
      <Route
        path={SelectAssetRoutes.Account}
        element={
          <SelectAccount onClick={handleAccountSelect}  />
        }
      />
      <Route path='/' element={() => <Redirect  to={SelectAssetRoutes.Search} />} />
    </Routes>
  )
}
function useNavigate() {
  throw new Error('Function not implemented.')
}

