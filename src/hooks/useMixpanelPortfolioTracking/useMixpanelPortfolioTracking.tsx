import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { useEffect, useState } from 'react'
import { createSelector } from 'reselect'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
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
  const { wallet, isDemoWallet } = useWallet().state
  const isMarketDataLoaded = useAppSelector(selectMarketDataLoaded)

  useEffect(() => {
    // we've changed wallets, reset tracking
    if (!wallet) return setIsTracked(false)
    // only track once per wallet connection
    if (isTracked) return
    // only track if market data is loaded
    if (isMarketDataLoaded && !isTracked) {
      const mp = getMixPanel()
      if (!mp) return
      // identify all users regardless
      mp.identify()
      // track a wallet connection - even if it's demo
      mp.track(MixPanelEvents.ConnectWallet)
      // only track anonymized portfolio for real wallets
      if (!isDemoWallet) mp.people.set(anonymizedPortfolio)
      // don't track again for this wallet connection session
      setIsTracked(true)
    }
  }, [anonymizedPortfolio, isDemoWallet, isMarketDataLoaded, isTracked, wallet])
}
