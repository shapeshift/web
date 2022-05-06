import { AssetId } from '@shapeshiftoss/caip'
import { Trade as FinalizedTrade, TradeQuote } from '@shapeshiftoss/swapper'
import { Asset, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { entries, TradeRoutes } from './TradeRoutes/TradeRoutes'
import { TradeAmountInputField } from './types'

export type TradeAsset = {
  asset: Asset
  amount?: string
}

export type TradeProps = {
  defaultBuyAssetId?: AssetId
}

export type BuildQuoteTxOutput = {
  success: boolean
  statusReason: string
}

export type TradeState<C extends ChainTypes> = {
  sellAsset: TradeAsset
  buyAsset: TradeAsset
  fiatSellAmount: string
  sellAssetFiatRate: string
  fees?: chainAdapters.QuoteFeeData<C>
  action?: TradeAmountInputField
  quote: TradeQuote<C>
  trade: FinalizedTrade<C>
}

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
