import { skipToken } from '@reduxjs/toolkit/query'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import type { SwapperContextType } from 'components/Trade/SwapperProvider/types'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
import { useGetUsdRatesQuery } from 'state/apis/swapper/getUsdRatesApi'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/*
The Fiat Rate Service is responsible for fetching and setting fiat rates.
It mutates the buyAssetFiatRate, sellAssetFiatRate, and feeAssetFiatRate properties of SwapperState.
It also triggers an update of calculated trade amounts when fiat rates change.
*/
export const useFiatRateService = (context: SwapperContextType) => {
  const {
    dispatch: swapperDispatch,
    state: { sellTradeAsset, buyTradeAsset, tradeQuoteInputArgs, activeSwapperWithMetadata },
  } = context
  const activeSwapperType = activeSwapperWithMetadata?.swapper?.getType()

  // Types
  type UsdRatesQueryInput = Parameters<typeof useGetUsdRatesQuery>
  type UsdRatesInputArgs = UsdRatesQueryInput[0]

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
  )?.assetId

  // API
  const { data: usdRates } = useGetUsdRatesQuery(usdRatesArgs, {
    pollingInterval: 30000,
  })

  // Trigger fiat rate query
  useEffect(() => {
    if (
      sellTradeAssetId &&
      buyTradeAssetId &&
      sellAssetFeeAssetId &&
      tradeQuoteInputArgs &&
      activeSwapperType
    ) {
      setUsdRatesArgs({
        tradeQuoteArgs: tradeQuoteInputArgs,
        feeAssetId: sellAssetFeeAssetId,
        activeSwapperType,
      })
    }
  }, [
    activeSwapperType,
    buyTradeAssetId,
    sellAssetFeeAssetId,
    sellTradeAssetId,
    tradeQuoteInputArgs,
  ])

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
}
