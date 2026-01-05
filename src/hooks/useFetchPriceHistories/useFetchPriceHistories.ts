import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect, useRef } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { fetchAndDispatchFiatPriceHistory } from '@/lib/graphql/helpers'
import { fetchPriceHistoriesBatchGraphQL } from '@/lib/graphql/priceHistoryData'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectPortfolioLoadingStatus } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useFetchPriceHistories = (assetIds: AssetId[], timeframe: HistoryTimeframe) => {
  const symbol = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const {
    state: { isConnected },
  } = useWallet()

  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const isReady = !isConnected || portfolioLoadingStatus !== 'loading'

  const prevAssetIdsRef = useRef<string>('')

  useEffect(() => {
    if (!isReady || assetIds.length === 0) return

    const assetIdsKey = assetIds.join(',')
    if (assetIdsKey === prevAssetIdsRef.current) return
    prevAssetIdsRef.current = assetIdsKey

    void fetchPriceHistoriesBatchGraphQL(assetIds, timeframe)
  }, [assetIds, timeframe, isReady])

  useEffect(() => {
    if (symbol === 'USD') return
    void fetchAndDispatchFiatPriceHistory(symbol, timeframe)
  }, [symbol, timeframe])
}
