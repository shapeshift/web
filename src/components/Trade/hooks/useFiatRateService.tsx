import { ethAssetId } from '@keepkey/caip'
import { skipToken } from '@reduxjs/toolkit/query'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { TS } from 'components/Trade/types'
import { useGetUsdRatesQuery } from 'state/apis/swapper/swapperApi'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/*
The Fiat Rate Service is responsible for fetching and setting fiat rates.
It mutates the buyAssetFiatRate, sellAssetFiatRate, and feeAssetFiatRate properties of TradeState.
It also triggers an update of calculated trade amounts when fiat rates change.
*/
export const useFiatRateService = () => {
  // Types
  type UsdRatesQueryInput = Parameters<typeof useGetUsdRatesQuery>
  type UsdRatesInputArgs = UsdRatesQueryInput[0]

  // Form hooks
  const { control, setValue } = useFormContext<TS>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  // State
  const [usdRatesArgs, setUsdRatesArgs] = useState<UsdRatesInputArgs>(skipToken)

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const sellTradeAssetId = sellAsset?.assetId
  const buyTradeAssetId = buyAsset?.assetId

  // Selectors
  const sellAssetFeeAssetId = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  ).assetId

  // API
  const { data: usdRates, isLoading: isLoadingFiatRateData } = useGetUsdRatesQuery(usdRatesArgs, {
    pollingInterval: 30000,
  })

  // Trigger fiat rate query
  useEffect(() => {
    if (sellTradeAssetId && buyTradeAssetId && sellAssetFeeAssetId) {
      setUsdRatesArgs({
        buyAssetId: buyTradeAssetId,
        sellAssetId: sellTradeAssetId,
        feeAssetId: sellAssetFeeAssetId,
      })
    }
  }, [buyTradeAssetId, sellAssetFeeAssetId, sellTradeAssetId])

  // Set fiat rates
  useEffect(() => {
    if (usdRates) {
      setValue('buyAssetFiatRate', usdRates.buyAssetUsdRate)
      setValue('sellAssetFiatRate', usdRates.sellAssetUsdRate)
      setValue('feeAssetFiatRate', usdRates.feeAssetUsdRate)
    }
  }, [usdRates, setValue])

  return { isLoadingFiatRateData }
}
