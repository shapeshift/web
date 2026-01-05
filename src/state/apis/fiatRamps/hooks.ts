import type { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'

import { fetchAndDispatchMarketData, fetchAndDispatchPriceHistory } from '@/lib/graphql/helpers'

export const useFetchFiatAssetMarketData = (assetIds: AssetId[]): void => {
  useEffect(() => {
    if (assetIds.length === 0) return

    void fetchAndDispatchMarketData(assetIds)

    assetIds.forEach(assetId => {
      void fetchAndDispatchPriceHistory(assetId, HistoryTimeframe.DAY)
    })
  }, [assetIds])
}
