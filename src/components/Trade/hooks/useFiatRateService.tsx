import { skipToken } from '@reduxjs/toolkit/query'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { useGetUsdRatesQuery } from 'state/apis/swapper/getUsdRatesApi'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Fiat Rate Service is responsible for fetching and setting fiat rates.
It mutates the buyAssetFiatRate, sellAssetFiatRate, and feeAssetFiatRate properties of SwapperState.
It also triggers an update of calculated trade amounts when fiat rates change.
*/
export const useFiatRateService = () => {
  const { tradeQuoteArgs } = useTradeQuoteService()

  // Types
  type UsdRatesQueryInput = Parameters<typeof useGetUsdRatesQuery>
  type UsdRatesInputArgs = UsdRatesQueryInput[0]

  // State
  const [usdRatesArgs, setUsdRatesArgs] = useState<UsdRatesInputArgs>(skipToken)

  // Selectors
  const sellAsset = useSwapperStore(state => state.sellAsset)
  const buyAsset = useSwapperStore(state => state.buyAsset)
  const sellTradeAssetId = sellAsset?.assetId
  const buyTradeAssetId = buyAsset?.assetId
  const sellAssetFeeAssetId = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  )?.assetId
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)

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
      updateSellAssetFiatRate(usdRates.sellAssetUsdRate)
      updateBuyAssetFiatRate(usdRates.buyAssetUsdRate)
      updateFeeAssetFiatRate(usdRates.feeAssetUsdRate)
    }
  }, [updateBuyAssetFiatRate, updateFeeAssetFiatRate, updateSellAssetFiatRate, usdRates])

  return { isLoadingFiatRateData }
}
