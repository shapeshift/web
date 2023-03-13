import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { useEffect, useState } from 'react'
import { createSelector } from 'reselect'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import type { ReduxState } from 'state/reducer'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectPortfolioAnonymized, selectPortfolioAssetIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useWallet } from '../useWallet/useWallet'

// define selector here to avoid circular imports, specific to this hook below
const selectMarketDataLoaded = createSelector(
  (s: ReduxState) => s,
  selectPortfolioAssetIds,
  (state, assetIds): boolean => {
    if (!assetIds.length) return false
    // for every asset in the portfolio, has market data loaded, either fulfilled or rejected
    return assetIds
      .map(assetId => marketApi.endpoints.findByAssetId.select(assetId)(state))
      .every(result => [QueryStatus.fulfilled, QueryStatus.rejected].includes(result.status))
  },
)

export const useMixpanelPortfolioTracking = () => {
  const anonymizedPortfolio = useAppSelector(selectPortfolioAnonymized)
  const [isTracked, setIsTracked] = useState(false)
  const wallet = useWallet().state.wallet
  const isMarketDataLoaded = useAppSelector(selectMarketDataLoaded)

  useEffect(() => {
    // we've changed wallets, reset tracking
    if (!wallet) return setIsTracked(false)
    // only track once per wallet connection
    if (isTracked) return
    // only track if market data is loaded
    if (isMarketDataLoaded && !isTracked) {
      getMixPanel()?.identify()
      getMixPanel()?.people.set(anonymizedPortfolio)
      setIsTracked(true)
    }
  }, [anonymizedPortfolio, isMarketDataLoaded, isTracked, wallet])
}
