import { AnimatePresence } from 'framer-motion'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'

import { Approval } from './components/Approval/Approval'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { TradeRoutePaths } from './types'

const MultiHopEntries = [TradeRoutePaths.Input, TradeRoutePaths.Approval, TradeRoutePaths.Confirm]

export const MultiHopTrade = () => {
  const methods = useForm({ mode: 'onChange' })

  return (
    <Card>
      <Card.Body py={6}>
        <FormProvider {...methods}>
          <MemoryRouter initialEntries={MultiHopEntries} initialIndex={0}>
            <MultiHopRoutes />
          </MemoryRouter>
        </FormProvider>
      </Card.Body>
    </Card>
  )
}

const MultiHopRoutes = () => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch key={location.key} location={location}>
        <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
          <TradeInput />
        </Route>
        <Route key={TradeRoutePaths.Confirm} path={TradeRoutePaths.Confirm}>
          <TradeConfirm />
        </Route>
        <Route key={TradeRoutePaths.Approval} path={TradeRoutePaths.Approval}>
          <Approval />
        </Route>
      </Switch>
    </AnimatePresence>
  )
}
