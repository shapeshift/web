import { ChainTypes } from '@shapeshiftoss/types'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { entries, TradeRoutes } from './TradeRoutes/TradeRoutes'
import { TradeState } from './types'

export const Trade = () => {
  const methods = useForm<TradeState<ChainTypes>>({
    mode: 'onChange',
    defaultValues: {
      fiatSellAmount: undefined,
    },
  })

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={entries}>
        <Switch>
          <Route path='/'>
            <TradeRoutes />
          </Route>
        </Switch>
      </MemoryRouter>
    </FormProvider>
  )
}
