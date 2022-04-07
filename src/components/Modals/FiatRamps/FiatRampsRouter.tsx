import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router-dom'

import { FiatRampsRoutes } from './FiatRampsCommon'
import { GemManager } from './views/GemManager'
import { RampsList } from './views/RampsList'

export const FiatRampsRouter = () => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path={FiatRampsRoutes.Select} component={RampsList} />
        <Route exact path={FiatRampsRoutes.Gem} component={GemManager} />
      </Switch>
    </AnimatePresence>
  )
}
