import type { Asset } from '@shapeshiftoss/asset-service'
import { useEffect } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { findAccountsByAssetId } from 'state/slices/portfolioSlice/utils'
import { selectPortfolioAccounts } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { SelectAccount } from './SelectAccount'
import { SelectAssetRoutes } from './SelectAssetCommon'
import type { SelectAssetLocation } from './SelectAssetRouter'
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
    const assetAccounts = findAccountsByAssetId(accounts, asset.assetId)
    if (assetAccounts && assetAccounts.length > 1) {
      history.push(SelectAssetRoutes.Account, { assetId: asset.assetId })
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
