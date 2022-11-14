import type { Asset } from '@shapeshiftoss/asset-service'
import { AnimatePresence } from 'framer-motion'
import type { RouteComponentProps } from 'react-router-dom'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { Approval } from 'components/Approval/Approval'
import { SelectAccount } from 'components/Trade/SelectAccount'

import { useSwapper } from '../hooks/useSwapper/useSwapper'
import { AssetClickAction, useTradeRoutes } from '../hooks/useTradeRoutes/useTradeRoutes'
import { SelectAsset } from '../SelectAsset'
import { TradeConfirm } from '../TradeConfirm/TradeConfirm'
import { TradeInput as TradeInputV2 } from '../TradeInput'
import { TradeRoutePaths } from '../types'

export const TradeRoutes = () => {
  const { getSupportedSellableAssets, getSupportedBuyAssetsFromSellAsset } = useSwapper()
  const location = useLocation()
  const { handleAssetClick } = useTradeRoutes()

  const handleAssetClickWithAction = (action: AssetClickAction) => (asset: Asset) =>
    handleAssetClick(asset, action)

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location}>
        <Route
          path={TradeRoutePaths.SellSelect}
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleAssetClickWithAction(AssetClickAction.Sell)}
              filterBy={getSupportedSellableAssets}
              {...props}
            />
          )}
        />
        <Route
          path={TradeRoutePaths.BuySelect}
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleAssetClickWithAction(AssetClickAction.Buy)}
              filterBy={getSupportedBuyAssetsFromSellAsset}
              {...props}
            />
          )}
        />
        <Route path={TradeRoutePaths.Input} component={TradeInputV2} />
        <Route path={TradeRoutePaths.Confirm} component={TradeConfirm} />
        <Route path={TradeRoutePaths.Approval} component={Approval} />
        <Route path={TradeRoutePaths.AccountSelect} component={SelectAccount} />
        <Redirect from='/' to={TradeRoutePaths.Input} />
      </Switch>
    </AnimatePresence>
  )
}
