import type { AssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { entries, TradeRoutes } from './TradeRoutes/TradeRoutes'
import type { TradeState } from './types'

export type TradeProps = {
  defaultBuyAssetId?: AssetId
}

export const Trade = ({ defaultBuyAssetId }: TradeProps) => {
  const methods = useForm<TradeState<KnownChainIds>>({
    mode: 'onChange',
    defaultValues: {
      fiatSellAmount: undefined,
      isExactAllowance: false,
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
