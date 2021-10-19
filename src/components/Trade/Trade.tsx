import { Asset, Quote } from '@shapeshiftoss/types'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { TradeActions } from 'components/Trade/hooks/useSwapper/useSwapper'

import { entries, TradeRoutes } from './TradeRoutes/TradeRoutes'

export type TradeAsset = {
  currency: Asset
  amount?: string
  fiatRate?: string
}

export type MinMax = {
  minimum: string
  maximum: string
  minimumPrice?: string
}

export type TradeState = {
  sellAsset: TradeAsset
  buyAsset: TradeAsset
  trade?: MinMax
  action?: TradeActions
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
