import { AssetId } from '@shapeshiftoss/caip'
import { Trade as FinalizedTrade,TradeQuote } from '@shapeshiftoss/swapper'
import { Asset, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { entries, TradeRoutes } from './TradeRoutes/TradeRoutes'
import { TradeAmountInputField } from './types'

export type TradeAsset = {
  currency: Asset
  amount?: string
  fiatRate?: string
}

export type TradeProps = {
  defaultBuyAssetId?: AssetId
}

export type BuildQuoteTxOutput = {
  success: boolean
  sellAsset: Asset
  buyAsset?: Asset
  statusReason: string
}

export type TradeState<C extends ChainTypes> = {
  sellAsset: TradeAsset
  buyAsset: TradeAsset
  fiatAmount: string
  fees?: chainAdapters.QuoteFeeData<C>
  action?: TradeAmountInputField
  quote?: TradeQuote<C>
  trade?: FinalizedTrade<C>
}

export const Trade = ({ defaultBuyAssetId }: TradeProps) => {
  const methods = useForm<TradeState<ChainTypes>>({
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
