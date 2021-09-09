import { Asset } from '@shapeshiftoss/asset-service'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { entries, TradeRoutes } from './TradeRoutes'

type TTradeInput = {
  fiatAmount?: string
  sellAsset: {
    currency: Asset
    amount?: string
  }
  buyAsset: {
    currency: Asset
    amount?: string
  }
}

export const Trade = () => {
  const methods = useForm<TTradeInput>({
    mode: 'onChange',
    defaultValues: {
      fiatAmount: undefined,
      sellAsset: {
        currency: undefined,
        amount: undefined
      },
      buyAsset: {
        currency: undefined,
        amount: undefined
      }
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
