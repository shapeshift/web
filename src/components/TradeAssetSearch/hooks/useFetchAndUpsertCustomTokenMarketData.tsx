import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectIsCustomAsset } from 'state/slices/selectors'
import { store } from 'state/store'

import { getTokenMarketData } from './useGetCustomTokenPriceQuery'

// Custom hook to fetch and upsert market data for custom tokens
export const useFetchAndUpsertCustomTokenMarketData = () => {
  const dispatch = useDispatch()

  const fetchAndUpsertCustomTokenMarketData = useCallback(
    async (assetId: string) => {
      const isCustomAsset = selectIsCustomAsset(store.getState(), assetId)
      if (!isCustomAsset) return

      const usdMarketData = await getTokenMarketData(assetId)
      if (usdMarketData) {
        // Add market data to the store
        dispatch(
          marketDataSlice.actions.setCryptoMarketData({
            [assetId]: {
              price: usdMarketData.price.toString(),
              marketCap: usdMarketData.market_cap.toString(),
              volume: '0', // Volume data is not available from Zerion, hence hardcoded to '0'
              changePercent24Hr: usdMarketData.changes.percent_1d,
            },
          }),
        )
      }
    },
    [dispatch],
  )

  return fetchAndUpsertCustomTokenMarketData
}
