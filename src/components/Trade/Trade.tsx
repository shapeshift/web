import { CAIP19 } from '@shapeshiftoss/caip'
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

export type TradeProps = {
  defaultBuyAssetId?: CAIP19
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
  estimatedGasFees?: string
}

export const Trade = ({ defaultBuyAssetId }: TradeProps) => {
  const methods = useForm<TradeState<ChainTypes, SwapperType>>({
    mode: 'onChange',
    defaultValues: {
      fiatAmount: undefined,
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
