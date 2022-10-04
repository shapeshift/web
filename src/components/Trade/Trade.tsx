import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
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
  const [sellAsset, setSellAsset] = useState<Asset | undefined>()
  const [buyAsset, setBuyAsset] = useState<Asset | undefined>()

  const methods = useForm<TS>({
    mode: 'onChange',
    defaultValues: {
      fiatSellAmount: '0',
      fiatBuyAmount: '0',
      amount: '0',
      sellTradeAsset: { amount: '0', asset: sellAsset },
      buyTradeAsset: { amount: '0', asset: buyAsset },
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
      setSellAsset(sellAsset)
      setBuyAsset(buyAsset)
      methods.setValue('sellTradeAsset.asset', sellAsset)
      methods.setValue('buyTradeAsset.asset', buyAsset)
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
