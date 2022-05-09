import { AnimatePresence } from 'framer-motion'
import { Redirect, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'
import { Approval } from 'components/Approval/Approval'

import { useSwapper } from '../hooks/useSwapper/useSwapper'
import { useTradeRoutes } from '../hooks/useTradeRoutes/useTradeRoutes'
import { SelectAsset } from '../SelectAsset'
import { TradeConfirm } from '../TradeConfirm/TradeConfirm'
import { TradeInput } from '../TradeInput'

export const entries = ['/send/details', '/send/confirm']

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
  SellSelect = '/trade/select/sell',
  BuySelect = '/trade/select/buy',
}

export const TradeRoutes = () => {
  const location = useLocation()
  const { handleBuyClick, handleSellClick } = useTradeRoutes()
  const { getSupportedSellableAssets, getSupportedBuyAssetsFromSellAsset } = useSwapper()

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path={TradeRoutePaths.SellSelect}
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleSellClick}
              filterBy={getSupportedSellableAssets}
              {...props}
            />
          )}
        />
        <Route
          path={TradeRoutePaths.BuySelect}
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleBuyClick}
              filterBy={getSupportedBuyAssetsFromSellAsset}
              {...props}
            />
          )}
        />
        <Route path={TradeRoutePaths.Input} component={TradeInput} />
        <Route path={TradeRoutePaths.Confirm} component={TradeConfirm} />
        <Route path={TradeRoutePaths.Approval} component={Approval} />
        <Redirect from='/' to={TradeRoutePaths.Input} />
      </Switch>
    </AnimatePresence>
  )
}
