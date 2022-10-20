import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { useDefaultAssets } from './hooks/useDefaultAssets'
import { entries, TradeRoutes } from './TradeRoutes/TradeRoutes'
import type { TS } from './types'
import { TradeAmountInputField } from './types'

export type TradeProps = {
  defaultBuyAssetId?: AssetId
}

export const Trade = ({ defaultBuyAssetId }: TradeProps) => {
  const { getDefaultAssets } = useDefaultAssets(defaultBuyAssetId)

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
      action: TradeAmountInputField.SELL_CRYPTO,
      isSendMax: false,
    },
  })

  useEffect(() => {
    ;(async () => {
      const result = await getDefaultAssets()
      if (!result) return
      const { buyAsset, sellAsset } = result
      methods.setValue('sellTradeAsset.asset', sellAsset)
      methods.setValue('buyTradeAsset.asset', buyAsset)
      methods.setValue('action', TradeAmountInputField.SELL_FIAT)
      methods.setValue('amount', '0')
      methods.setValue('sellTradeAsset.amount', '0')
      methods.setValue('buyTradeAsset.amount', '0')
      methods.setValue('fiatBuyAmount', '0')
      methods.setValue('fiatSellAmount', '0')
      methods.setValue('quote', undefined)
      methods.setValue('trade', undefined)
      methods.setValue('sellAssetFiatRate', undefined)
      methods.setValue('buyAssetFiatRate', undefined)
      methods.setValue('feeAssetFiatRate', undefined)
      methods.setValue('isSendMax', false)
    })()
  }, [defaultBuyAssetId, getDefaultAssets, methods])

  if (!methods) return null

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
