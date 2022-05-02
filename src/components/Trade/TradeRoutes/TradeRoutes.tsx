import { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { Redirect, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'
import { Approval } from 'components/Approval/Approval'

import { useSwapper } from '../hooks/useSwapper/useSwapper'
import { useTradeRoutes } from '../hooks/useTradeRoutes/useTradeRoutes'
import { SelectAsset } from '../SelectAsset'
import { TradeConfirm } from '../TradeConfirm/TradeConfirm'
import { TradeInput } from '../TradeInput'

export const entries = ['/send/details', '/send/confirm']

type TradeRoutesProps = {
  defaultBuyAssetId?: AssetId
}

export const TradeRoutes = ({ defaultBuyAssetId }: TradeRoutesProps) => {
  const location = useLocation()
  const { handleBuyClick, handleSellClick } = useTradeRoutes(defaultBuyAssetId)
  const { getSupportedSellableAssets, getSupportedBuyAssetsFromSellAsset } = useSwapper()

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path='/trade/select/sell'
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleSellClick}
              filterBy={getSupportedSellableAssets}
              {...props}
            />
          )}
        />
        <Route
          path='/trade/select/buy'
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleBuyClick}
              filterBy={getSupportedBuyAssetsFromSellAsset}
              {...props}
            />
          )}
        />
        <Route path='/trade/input' component={TradeInput} />
        <Route path='/trade/confirm' component={TradeConfirm} />
        <Route path='/trade/approval' component={Approval} />
        <Redirect from='/' to='/trade/input' />
      </Switch>
    </AnimatePresence>
  )
}
