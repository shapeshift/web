import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router-dom'

import { FiatRampsRoutes } from './FiatRamps'
import { GemManager } from './views/GemManager'
import { RampsList } from './views/RampsList'

export const FiatRampsRouter = () => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route path={FiatRampsRoutes.Select} component={RampsList} />
        <Route path={FiatRampsRoutes.Gem} component={GemManager} />
      </Switch>
    </AnimatePresence>
  )
}
