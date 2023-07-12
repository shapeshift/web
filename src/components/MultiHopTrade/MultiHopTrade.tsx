import { AnimatePresence } from 'framer-motion'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Redirect, Route, Switch } from 'react-router-dom'
import { Card } from 'components/Card/Card'

import { Approval } from './components/Approval/Approval'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { TradeRoutePaths } from './types'

export const MultiHopTrade = () => {
  const methods = useForm({ mode: 'onChange' })

  return (
    <Card>
      <Card.Body py={6}>
        <FormProvider {...methods}>
          <MemoryRouter>
            <Route>
              {({ location }) => (
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
                    <Redirect to={TradeRoutePaths.Input} />
                  </Switch>
                </AnimatePresence>
              )}
            </Route>
          </MemoryRouter>
        </FormProvider>
      </Card.Body>
    </Card>
  )
}
