import { Asset, Quote } from '@shapeshiftoss/types'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { entries, TradeRoutes } from './TradeRoutes'

export type TradeAsset = {
  currency: Asset
  amount?: string
  fiatRate?: string
}

export type TradeState = {
  sellAsset: TradeAsset
  buyAsset: TradeAsset
  fiatAmount?: string
  quote?: Quote
}

export const Trade = () => {
  const methods = useForm<TradeState>({
    mode: 'onChange',
    defaultValues: {
      fiatAmount: undefined
    }
  })
  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={entries}>
        <Switch>
          <Route path='/' component={TradeRoutes} />
        </Switch>
      </MemoryRouter>
    </FormProvider>
  )
}
