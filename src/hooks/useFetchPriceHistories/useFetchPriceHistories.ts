import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useQueries } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { DEFAULT_HISTORY_TIMEFRAME } from '@/constants/Config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { fetchPriceHistoriesBatchGraphQL } from '@/lib/graphql/priceHistoryData'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectPortfolioLoadingStatus } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const { findPriceHistoryByFiatSymbol } = marketApi.endpoints

const marketDataPollingInterval = 60 * 15 * 1000

export const useFetchPriceHistories = (assetIds: AssetId[], timeframe: HistoryTimeframe) => {
  const dispatch = useAppDispatch()
  const symbol = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const isGraphQLEnabled = useFeatureFlag('GraphQLPoc')
  const {
    state: { isConnected },
  } = useWallet()

  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const isReady = !isConnected || portfolioLoadingStatus !== 'loading'

  const prevAssetIdsRef = useRef<string>('')

  useEffect(() => {
    if (!isGraphQLEnabled) return
    if (!isReady || assetIds.length === 0) return

    const assetIdsKey = assetIds.join(',')
    if (assetIdsKey === prevAssetIdsRef.current) return
    prevAssetIdsRef.current = assetIdsKey

    fetchPriceHistoriesBatchGraphQL(assetIds, timeframe)
  }, [assetIds, timeframe, isGraphQLEnabled, isReady])

  useEffect(() => {
    if (isGraphQLEnabled) return
    assetIds.forEach(assetId => {
      dispatch(marketApi.endpoints.findPriceHistoryByAssetId.initiate({ assetId, timeframe }))
    })
  }, [assetIds, dispatch, timeframe, isGraphQLEnabled])

  useQueries({
    queries: isGraphQLEnabled
      ? []
      : assetIds.map(assetId => ({
          queryKey: ['marketData', assetId],
          queryFn: async () => {
            const timeframe = DEFAULT_HISTORY_TIMEFRAME

            await Promise.all(
              assetIds.map(assetId =>
                dispatch(
                  marketApi.endpoints.findPriceHistoryByAssetId.initiate(
                    {
                      timeframe,
                      assetId,
                    },
                    { forceRefetch: true },
                  ),
                ),
              ),
            )

            return null
          },
          enabled: isReady,
          refetchInterval: marketDataPollingInterval,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: false,
        })),
  })

  useEffect(() => {
    if (symbol === 'USD') return
    dispatch(findPriceHistoryByFiatSymbol.initiate({ symbol, timeframe }))
  }, [dispatch, symbol, timeframe])
}
