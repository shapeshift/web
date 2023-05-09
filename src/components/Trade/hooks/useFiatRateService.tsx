import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectFeeAssetById,
  selectFiatToUsdRate,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { selectBuyAsset, selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Fiat Rate Service is responsible for fetching and setting fiat rates.
It mutates the buyAssetFiatRate, sellAssetFiatRate, and feeAssetFiatRate properties of SwapperState.
It also triggers an update of calculated trade amounts when fiat rates change.
*/
export const useFiatRateService = () => {
  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const sellAsset = useSwapperStore(selectSellAsset)
  const buyAsset = useSwapperStore(selectBuyAsset)

  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateSelectedCurrencyToUsdRate = useSwapperStore(
    state => state.updateSelectedCurrencyToUsdRate,
  )

  const feeAssetId = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset.assetId ?? ethAssetId),
  )?.assetId

  const sellAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, sellAsset.assetId),
  )
  const buyAssetMarketData = useAppSelector(state => selectMarketDataById(state, buyAsset.assetId))
  const feeAssetMarketData = useAppSelector(state =>
    feeAssetId ? selectMarketDataById(state, feeAssetId) : undefined,
  )

  useEffect(() => {
    updateSelectedCurrencyToUsdRate(selectedCurrencyToUsdRate)
  }, [selectedCurrencyToUsdRate, updateSelectedCurrencyToUsdRate])

  useEffect(() => {
    updateSellAssetFiatRate(
      bnOrZero(sellAssetMarketData.price).times(selectedCurrencyToUsdRate).toString(),
    )
  }, [sellAssetMarketData, selectedCurrencyToUsdRate, updateSellAssetFiatRate])

  useEffect(() => {
    updateBuyAssetFiatRate(
      bnOrZero(buyAssetMarketData.price).times(selectedCurrencyToUsdRate).toString(),
    )
  }, [buyAssetMarketData, selectedCurrencyToUsdRate, updateBuyAssetFiatRate])

  useEffect(() => {
    updateFeeAssetFiatRate(
      bnOrZero(feeAssetMarketData?.price).times(selectedCurrencyToUsdRate).toString(),
    )
  }, [feeAssetMarketData, selectedCurrencyToUsdRate, updateFeeAssetFiatRate])
}
