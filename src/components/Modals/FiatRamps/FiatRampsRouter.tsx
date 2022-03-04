import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router-dom'

import { BuySellRoutes } from './FiatRamps'
import { GemManager } from './views/GemManager'
import { RampsList } from './views/RampsList'

export const FiatRampsRouter = () => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route path={BuySellRoutes.Select} component={RampsList} />
        <Route path={BuySellRoutes.Gem} component={GemManager} />
      </Switch>
    </AnimatePresence>
  )
}
