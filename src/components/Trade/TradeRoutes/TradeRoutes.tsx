import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, RouteProps, Switch, useLocation } from 'react-router-dom'
import { Approval } from 'components/Approval/Approval'

import { useTradeRoutes } from '../hooks/useTradeRoutes/useTradeRoutes'
import { SelectAsset } from '../SelectAsset'
import { TradeConfirm } from '../TradeConfirm/TradeConfirm'
import { TradeInput } from '../TradeInput'

export const entries = ['/send/details', '/send/confirm']

export const TradeRoutes = () => {
  const location = useLocation()
  const { handleBuyClick, handleSellClick } = useTradeRoutes()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path='/trade/select/sell'
          element={(props: RouteProps) => <SelectAsset onClick={handleSellClick} {...props} />}
        />
        <Route
          path='/trade/select/buy'
          element={(props: RouteProps) => <SelectAsset onClick={handleBuyClick} {...props} />}
        />
        <Route path='/trade/input' element={TradeInput} />
        <Route path='/trade/confirm' element={TradeConfirm} />
        <Route path='/trade/approval' element={Approval} />
        <Navigate to='/trade/input' />
      </Switch>
    </AnimatePresence>
  )
}
