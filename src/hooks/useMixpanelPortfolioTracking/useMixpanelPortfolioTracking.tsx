import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { useEffect, useState } from 'react'
import { createSelector } from 'reselect'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { ReduxState } from 'state/reducer'
import { selectWalletId } from 'state/slices/common-selectors'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectPortfolioAnonymized, selectPortfolioAssetIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
  const { isDemoWallet } = useWallet().state
  const isMarketDataLoaded = useAppSelector(selectMarketDataLoaded)
  const walletId = useAppSelector(selectWalletId)

  useEffect(() => {
    // only track anonymized portfolio for real wallets
    if (isDemoWallet) return
    // only track once per wallet connection
    if (isTracked) return
    // only track if market data is loaded
    if (!isMarketDataLoaded) return

    // only track if we have a wallet id
    if (!walletId) return

    const mp = getMixPanel()
    if (!mp) return
    // track portfolio loaded event now that market data is loaded
    mp.track(MixPanelEvents.PortfolioLoaded, anonymizedPortfolio)
    // set this against the user
    mp.people.set(anonymizedPortfolio) // TODO(0xdef1cafe): restructure multiple wallets per user
    // don't track again for this wallet connection session
    setIsTracked(true)
  }, [anonymizedPortfolio, isDemoWallet, isMarketDataLoaded, isTracked, walletId])

  useEffect(() => {
    // we've changed wallets, reset tracking
    setIsTracked(false)
  }, [walletId])
}
