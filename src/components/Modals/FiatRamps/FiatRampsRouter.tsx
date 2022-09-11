import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Route, Switch, useLocation } from 'react-router-dom'

import type { FiatRamp } from './config'
import { FiatRampsRoutes } from './FiatRampsCommon'
import { Manager } from './views/Manager'
import { RampsList } from './views/RampsList'

export const FiatRampsRouter = () => {
  const location = useLocation()
  const [fiatRampProvider, setFiatRampProvider] = useState<FiatRamp | null>(null)
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path={FiatRampsRoutes.Select}>
          <RampsList setFiatRampProvider={setFiatRampProvider} />
        </Route>
        <Route exact path={FiatRampsRoutes.Manager}>
          {fiatRampProvider && <Manager fiatRampProvider={fiatRampProvider} />}
        </Route>
      </Switch>
    </AnimatePresence>
  )
}
