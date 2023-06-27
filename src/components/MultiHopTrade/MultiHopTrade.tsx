import { AnimatePresence } from 'framer-motion'
import { FormProvider, useForm } from 'react-hook-form'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { Approval } from 'components/Approval/Approval'

import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { TradeRoutePaths } from './types'

export const MultiHopTrade = () => {
  const location = useLocation()
  const methods = useForm({ mode: 'onChange' })

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <FormProvider {...methods}>
        <Switch location={location}>
          <Route path={TradeRoutePaths.Input}>
            <TradeInput />
          </Route>
          <Route path={TradeRoutePaths.Confirm}>
            <TradeConfirm />
          </Route>
          <Route path={TradeRoutePaths.Approval}>
            <Approval />
          </Route>
          <Redirect from='/' to={TradeRoutePaths.Input} />
        </Switch>
      </FormProvider>
    </AnimatePresence>
  )
}
