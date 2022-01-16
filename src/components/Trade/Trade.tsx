import { Asset, chainAdapters, ChainTypes, Quote, SwapperType } from '@shapeshiftoss/types'
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
  name?: string
}

export type TradeState<C extends ChainTypes, S extends SwapperType> = {
  sellAsset: TradeAsset
  buyAsset: TradeAsset
  fees?: chainAdapters.QuoteFeeData<C, S>
  trade?: MinMax
  action?: TradeActions
  fiatAmount?: string
  quote?: Quote<C, S>
}

export const Trade = () => {
  const methods = useForm<TradeState<ChainTypes, SwapperType>>({
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
