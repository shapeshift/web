import { AnimatePresence } from 'framer-motion'
import type { RouteComponentProps } from 'react-router-dom'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { Approval } from 'components/Approval/Approval'
import { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import type { Asset } from 'lib/asset-service'

import { useSwapper } from '../hooks/useSwapper/useSwapper'
import { useTradeRoutes } from '../hooks/useTradeRoutes/useTradeRoutes'
import { SelectAsset } from '../SelectAsset'
import { TradeConfirm } from '../TradeConfirm/TradeConfirm'
import { TradeInput } from '../TradeInput'
import { TradeRoutePaths } from '../types'

export const TradeRoutes = () => {
  const { supportedSellAssetsByMarketCap, supportedBuyAssetsByMarketCap } = useSwapper()
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
              assets={supportedSellAssetsByMarketCap}
              {...props}
            />
          )}
        />
        <Route
          path={TradeRoutePaths.BuySelect}
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleAssetClickWithAction(AssetClickAction.Buy)}
              assets={supportedBuyAssetsByMarketCap}
              {...props}
            />
          )}
        />
        <Route path={TradeRoutePaths.Input}>
          <TradeInput />
        </Route>
        <Route path={TradeRoutePaths.Confirm}>
          <TradeConfirm />
        </Route>
        <Route path={TradeRoutePaths.Approval}>
          <Approval />
        </Route>
        <Redirect from='/' to={TradeRoutePaths.Input} />
      </Switch>
    </AnimatePresence>
  )
}
