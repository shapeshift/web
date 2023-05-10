import { skipToken } from '@reduxjs/toolkit/query'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetUsdRatesQuery } from 'state/apis/swapper/getUsdRatesApi'
import { selectFeeAssetById, selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { selectBuyAsset, selectSellAsset } from 'state/zustand/swapperStore/selectors'
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
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const sellAsset = useSwapperStore(selectSellAsset)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellTradeAssetId = sellAsset?.assetId
  const buyTradeAssetId = buyAsset?.assetId
  const sellAssetFeeAssetId = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  )?.assetId
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateSelectedCurrencyToUsdRate = useSwapperStore(
    state => state.updateSelectedCurrencyToUsdRate,
  )

  /*
    We need to pick a source for our USD rates. If we update it basic on the active swapper the UI jumps
    whenever the user changes the active swapper, which is not great UX. So, we use the best swapper
    as our source of truth.
   */
  const bestSwapperType = useSwapperStore(
    state => state.availableSwappersWithMetadata?.[0]?.swapper,
  )?.getType()

  // API
  const { data: usdRates, isLoading: isLoadingFiatRateData } = useGetUsdRatesQuery(usdRatesArgs, {
    pollingInterval: 30000,
  })

  // Trigger fiat rate query
  useEffect(() => {
    if (
      sellTradeAssetId &&
      buyTradeAssetId &&
      sellAssetFeeAssetId &&
      tradeQuoteArgs &&
      bestSwapperType
    ) {
      setUsdRatesArgs({
        tradeQuoteArgs,
        feeAssetId: sellAssetFeeAssetId,
        swapperType: bestSwapperType,
      })
    }
  }, [bestSwapperType, buyTradeAssetId, sellAssetFeeAssetId, sellTradeAssetId, tradeQuoteArgs])

  // Set fiat rates
  useEffect(() => {
    updateSelectedCurrencyToUsdRate(selectedCurrencyToUsdRate)
    if (usdRates) {
      const { sellAssetUsdRate, buyAssetUsdRate, feeAssetUsdRate } = usdRates
      updateSellAssetFiatRate(
        bnOrZero(sellAssetUsdRate).times(selectedCurrencyToUsdRate).toString(),
      )
      updateBuyAssetFiatRate(bnOrZero(buyAssetUsdRate).times(selectedCurrencyToUsdRate).toString())
      updateFeeAssetFiatRate(bnOrZero(feeAssetUsdRate).times(selectedCurrencyToUsdRate).toString())
    }
  }, [
    selectedCurrencyToUsdRate,
    updateBuyAssetFiatRate,
    updateFeeAssetFiatRate,
    updateSelectedCurrencyToUsdRate,
    updateSellAssetFiatRate,
    usdRates,
  ])

  return { isLoadingFiatRateData }
}
