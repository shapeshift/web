import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

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

  const methods = useForm({ mode: 'onChange' })

  const updateFiatBuyAmount = useSwapperStore(state => state.updateBuyAmountFiat)
  const updateFiatSellAmount = useSwapperStore(state => state.updateSellAmountFiat)
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateAction = useSwapperStore(state => state.updateAction)
  const updateIsExactAllowance = useSwapperStore(state => state.updateIsExactAllowance)
  const updateAmount = useSwapperStore(state => state.updateAmount)
  const updateTrade = useSwapperStore(state => state.updateTrade)
  const updateBuyAsset = useSwapperStore(state => state.updateBuyAsset)
  const updateSellAsset = useSwapperStore(state => state.updateSellAsset)
  const updateBuyAmountCryptoPrecision = useSwapperStore(
    state => state.updateBuyAmountCryptoPrecision,
  )
  const updateSellAmountCryptoPrecision = useSwapperStore(
    state => state.updateSellAmountCryptoPrecision,
  )

  // The route has changed, so re-enable the default values useEffect
  useEffect(() => setHasSetDefaultValues(false), [location])

  useEffect(() => {
    // Don't run this effect within the lifecycle of /trade routes
    if (location.pathname === '/trade') return
    if (hasSetDefaultValues) return
    ;(async () => {
      const result = await getDefaultAssets()
      if (!result) return
      const { buyAsset, sellAsset } = result
      updateAction(TradeAmountInputField.SELL_FIAT)
      updateIsExactAllowance(false)
      updateBuyAsset(buyAsset)
      updateBuyAmountCryptoPrecision('0')
      updateAmount('0')
      updateSellAsset(sellAsset)
      updateSellAmountCryptoPrecision('0')
      updateFiatBuyAmount('0')
      updateFiatSellAmount('0')
      updateSellAssetFiatRate(undefined)
      updateBuyAssetFiatRate(undefined)
      updateFeeAssetFiatRate(undefined)
      updateTrade(undefined)
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
    updateFiatBuyAmount,
    updateFiatSellAmount,
    updateSellAssetFiatRate,
    updateBuyAssetFiatRate,
    updateFeeAssetFiatRate,
    updateAction,
    updateIsExactAllowance,
    updateAmount,
    updateTrade,
    updateBuyAsset,
    updateBuyAmountCryptoPrecision,
    updateSellAsset,
    updateSellAmountCryptoPrecision,
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
