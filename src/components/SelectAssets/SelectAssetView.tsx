import { Asset } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation
} from 'react-router-dom'
import {
  AccountSpecifier,
  findAccountsByAssetId,
  selectPortfolioAccounts
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { SelectAccount } from './SelectAccount'
import { SelectAssetLocation, SelectAssetRoutes } from './SelectAssetRouter'
import { SelectAssets } from './SelectAssets'

type SelectAssetViewProps = {
  onClick: (asset: Asset, accountId: AccountSpecifier) => void
} & SelectAssetLocation &
  RouteComponentProps

export const SelectAssetView = ({ onClick, toRoute, assetId }: SelectAssetViewProps) => {
  const location = useLocation<SelectAssetLocation>()
  const history = useHistory()

  const accounts = useAppSelector(state => selectPortfolioAccounts(state))

  const handleAssetSelect = (asset: Asset) => {
    const assetAccounts = findAccountsByAssetId(accounts, asset.caip19)
    if (assetAccounts && assetAccounts.length > 1) {
      history.push(SelectAssetRoutes.Account, { assetId: asset.caip19 })
    } else {
      handleAccountSelect(asset, assetAccounts[0])
    }
  }
  const handleAccountSelect = (asset: Asset, accountId: AccountSpecifier) => {
    onClick(asset, accountId)
  }

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
          <SelectAssets onClick={handleAssetSelect} {...props} />
        )}
      />
      <Route
        path={SelectAssetRoutes.Account}
        component={(props: RouteComponentProps) => (
          <SelectAccount onClick={handleAccountSelect} {...props} />
        )}
      />
      <Redirect from='/' to={SelectAssetRoutes.Search} />
    </Switch>
  )
}
