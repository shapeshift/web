import { AnimatePresence } from 'framer-motion'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'

import { BuySellRoutes } from './BuySell'
import { BuySellRamps } from './ramps/BuySellRamps'
import { GemManager } from './ramps/GemManager'

export const BuySellRouter = () => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route path={BuySellRoutes.Select} component={BuySellRamps} />
        <Route path={BuySellRoutes.Gem} component={GemManager} />
        <Redirect exact from='/' to={BuySellRoutes.Select} />
      </Switch>
    </AnimatePresence>
  )
}
