import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import type { SwapperState } from 'components/Trade/SwapperProvider/types'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'

import { useDefaultAssets } from './hooks/useDefaultAssets'
import { TradeRoutes } from './TradeRoutes/TradeRoutes'
import { TradeAmountInputField } from './types'

export type TradeProps = {
  defaultBuyAssetId?: AssetId
}

export const Trade = ({ defaultBuyAssetId }: TradeProps) => {
  const { getDefaultAssets, defaultAssetIdPair } = useDefaultAssets(defaultBuyAssetId)
  const location = useLocation()
  const [hasSetDefaultValues, setHasSetDefaultValues] = useState<boolean>(false)

  const { dispatch: swapperDispatch } = useSwapperState()

  const methods = useForm({ mode: 'onChange' })

  // The route has changed, so re-enable the default values useEffect
  useEffect(() => setHasSetDefaultValues(false), [location])

  useEffect(() => {
    if (hasSetDefaultValues) return
    ;(async () => {
      const result = await getDefaultAssets()
      if (!result) return
      const { buyAsset, sellAsset } = result
      const swapperState: Partial<SwapperState> = {
        sellTradeAsset: {
          asset: sellAsset,
          amountCryptoPrecision: '0',
        },
        buyTradeAsset: {
          asset: buyAsset,
          amountCryptoPrecision: '0',
        },
        quote: undefined,
        fiatBuyAmount: '0',
        fiatSellAmount: '0',
        sellAssetFiatRate: undefined,
        buyAssetFiatRate: undefined,
        feeAssetFiatRate: undefined,
        trade: undefined,
        action: TradeAmountInputField.SELL_FIAT,
        isExactAllowance: false,
        amount: '0',
      }
      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: swapperState,
      })
      const defaultAssetsAreChainDefaults =
        sellAsset?.assetId === defaultAssetIdPair?.sellAssetId &&
        buyAsset?.assetId === defaultAssetIdPair?.buyAssetId
      if (!defaultAssetsAreChainDefaults && defaultAssetIdPair) {
        // If the default assets are the chain defaults then keep this useEffect active as we might not have stabilized
        // Else, we know the default values have been set, so don't run this again unless the route changes
        setHasSetDefaultValues(true)
      }
    })()
  }, [
    defaultBuyAssetId,
    getDefaultAssets,
    methods,
    location,
    hasSetDefaultValues,
    defaultAssetIdPair?.sellAssetId,
    defaultAssetIdPair?.buyAssetId,
    defaultAssetIdPair,
    swapperDispatch,
  ])

  if (!methods) return null

  return (
    <FormProvider {...methods}>
      <MemoryRouter>
        <TradeRoutes />
      </MemoryRouter>
    </FormProvider>
  )
}
