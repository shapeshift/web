import type { AssetId } from '@shapeshiftoss/caip'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { entries, TradeRoutes } from './TradeRoutes/TradeRoutes'
import type { TS } from './types'

export type TradeProps = {
  defaultBuyAssetId?: AssetId
}

export const Trade = ({ defaultBuyAssetId }: TradeProps) => {
  const methods = useForm<TS>({
    mode: 'onChange',
    defaultValues: {
      fiatSellAmount: '0',
      fiatBuyAmount: '0',
      amount: '0',
      sellTradeAsset: { amount: '0' },
      buyTradeAsset: { amount: '0' },
      isExactAllowance: false,
      slippage: 0.002,
    },
  })

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={entries}>
        <Switch>
          <Route path='/'>
            <TradeRoutes defaultBuyAssetId={defaultBuyAssetId} />
          </Route>
        </Switch>
      </MemoryRouter>
    </FormProvider>
  )
}
