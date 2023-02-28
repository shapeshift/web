import type { AssetId } from '@shapeshiftoss/caip'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SwapperActionType, useSwapperState } from 'components/Trade/swapperProvider'

import { useDefaultAssets } from './hooks/useDefaultAssets'
import { TradeRoutes } from './TradeRoutes/TradeRoutes'
import type { TS } from './types'
import { TradeAmountInputField } from './types'

export type TradeProps = {
  defaultBuyAssetId?: AssetId
}

export const Trade = ({ defaultBuyAssetId }: TradeProps) => {
  const { getDefaultAssets, defaultAssetIdPair } = useDefaultAssets(defaultBuyAssetId)
  const location = useLocation()
  const [hasSetDefaultValues, setHasSetDefaultValues] = useState<boolean>(false)

  const { dispatch: swapperDispatch } = useSwapperState()

  const methods = useForm<TS>({
    mode: 'onChange',
    defaultValues: {
      fiatSellAmount: '0',
      fiatBuyAmount: '0',
      amount: '0',
      isExactAllowance: false,
      slippage: DEFAULT_SLIPPAGE,
      action: TradeAmountInputField.SELL_CRYPTO,
      isSendMax: false,
    },
  })

  // The route has changed, so re-enable the default values useEffect
  useEffect(() => setHasSetDefaultValues(false), [location])

  useEffect(() => {
    if (hasSetDefaultValues) return
    ;(async () => {
      const result = await getDefaultAssets()
      if (!result) return
      const { buyAsset, sellAsset } = result
      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: {
          sellTradeAsset: {
            asset: sellAsset,
            amountCryptoPrecision: '0',
          },
          buyTradeAsset: {
            asset: buyAsset,
            amountCryptoPrecision: '0',
          },
          quote: undefined,
        },
      })
      const defaultAssetsAreChainDefaults =
        sellAsset?.assetId === defaultAssetIdPair?.sellAssetId &&
        buyAsset?.assetId === defaultAssetIdPair?.buyAssetId
      if (!defaultAssetsAreChainDefaults && defaultAssetIdPair) {
        // If the default assets are the chain defaults then keep this useEffect active as we might not have stabilized
        // Else, we know the default values have been set, so don't run this again unless the route changes
        setHasSetDefaultValues(true)
      }
      methods.setValue('action', TradeAmountInputField.SELL_FIAT)
      methods.setValue('amount', '0')
      methods.setValue('fiatBuyAmount', '0')
      methods.setValue('fiatSellAmount', '0')
      methods.setValue('trade', undefined)
      methods.setValue('sellAssetFiatRate', undefined)
      methods.setValue('buyAssetFiatRate', undefined)
      methods.setValue('feeAssetFiatRate', undefined)
      methods.setValue('isSendMax', false)
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
