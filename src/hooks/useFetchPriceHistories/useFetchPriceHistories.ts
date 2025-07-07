import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useSuspenseQueries } from '@tanstack/react-query'
import { useEffect } from 'react'

import { DEFAULT_HISTORY_TIMEFRAME } from '@/constants/Config'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectPortfolioLoadingStatus } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const { findPriceHistoryByFiatSymbol } = marketApi.endpoints

const marketDataPollingInterval = 60 * 15 * 1000 // refetch data every 15 minutes

export const useFetchPriceHistories = (assetIds: AssetId[], timeframe: HistoryTimeframe) => {
  const dispatch = useAppDispatch()
  const symbol = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const {
    state: { isConnected },
  } = useWallet()

  useEffect(() => {
    assetIds.forEach(assetId => {
      dispatch(marketApi.endpoints.findPriceHistoryByAssetId.initiate({ assetId, timeframe }))
    })
  }, [assetIds, dispatch, timeframe])

  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)

  useSuspenseQueries({
    queries: assetIds.map(assetId => ({
      queryKey: ['marketData', assetId],
      queryFn: async () => {
        // Only commented out to make it clear we do NOT want to use RTK options here
        // We use react-query as a wrapper because it allows us to disable refetch for background tabs
        // const opts = { subscriptionOptions: { pollingInterval: marketDataPollingInterval } }
        const timeframe = DEFAULT_HISTORY_TIMEFRAME

        await Promise.all(
          assetIds.map(assetId =>
            dispatch(
              marketApi.endpoints.findPriceHistoryByAssetId.initiate(
                {
                  timeframe,
                  assetId,
                },
                // Since we use react-query as a polling wrapper, every initiate call *is* a force refetch here
                { forceRefetch: true },
              ),
            ),
          ),
        )

        // We *have* to return a value other than undefined from react-query queries, see
        // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
        return null
      },
      // once the portfolio is loaded, fetch market data for all portfolio assets
      // and start refetch timer to keep market data up to date
      enabled: !isConnected || portfolioLoadingStatus !== 'loading',
      refetchInterval: marketDataPollingInterval,
      // Do NOT refetch market data in background to avoid spamming coingecko
      refetchIntervalInBackground: false,
      // Do NOT refetch market data on window focus to avoid spamming coingecko
      refetchOnWindowFocus: false,
    })),
  })

  useEffect(() => {
    // we already know 1usd costs 1usd
    if (symbol === 'USD') return
    dispatch(findPriceHistoryByFiatSymbol.initiate({ symbol, timeframe }))
  }, [dispatch, symbol, timeframe])
}
