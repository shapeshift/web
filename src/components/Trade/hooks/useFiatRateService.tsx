import { skipToken } from '@reduxjs/toolkit/query'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { SwapperActionType, useSwapperState } from 'components/Trade/swapperProvider'
import { useGetUsdRatesQuery } from 'state/apis/swapper/getUsdRatesApi'
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

  // Hooks
  const { tradeQuoteArgs } = useTradeQuoteService()

  // State
  const [usdRatesArgs, setUsdRatesArgs] = useState<UsdRatesInputArgs>(skipToken)
  const { dispatch: swapperDispatch, sellTradeAsset, buyTradeAsset } = useSwapperState()

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const sellTradeAssetId = sellAsset?.assetId
  const buyTradeAssetId = buyAsset?.assetId

  // Selectors
  const sellAssetFeeAssetId = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  )?.assetId

  // API
  const { data: usdRates, isLoading: isLoadingFiatRateData } = useGetUsdRatesQuery(usdRatesArgs, {
    pollingInterval: 30000,
  })

  // Trigger fiat rate query
  useEffect(() => {
    if (sellTradeAssetId && buyTradeAssetId && sellAssetFeeAssetId && tradeQuoteArgs) {
      setUsdRatesArgs({
        tradeQuoteArgs,
        feeAssetId: sellAssetFeeAssetId,
      })
    }
  }, [buyTradeAssetId, sellAssetFeeAssetId, sellTradeAssetId, tradeQuoteArgs])

  // Set fiat rates
  useEffect(() => {
    if (usdRates) {
      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: {
          buyAssetFiatRate: usdRates.buyAssetUsdRate,
          sellAssetFiatRate: usdRates.sellAssetUsdRate,
          feeAssetFiatRate: usdRates.feeAssetUsdRate,
        },
      })
    }
  }, [usdRates, swapperDispatch])

  return { isLoadingFiatRateData }
}
