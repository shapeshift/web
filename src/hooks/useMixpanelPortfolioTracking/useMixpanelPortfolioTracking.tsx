import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import { useEffect, useState } from 'react'
import { createSelector } from 'reselect'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import type { ReduxState } from 'state/reducer'
import { selectWalletId } from 'state/slices/common-selectors'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectCurrencyFormat,
  selectPortfolioAnonymized,
  selectPortfolioAssetIds,
  selectSelectedCurrency,
  selectSelectedLocale,
} from 'state/slices/selectors'
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
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const selectedCurrencyFormat = useAppSelector(selectCurrencyFormat)

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
    mp.people.set(
      Object.assign(
        {},
        // set this against the user
        anonymizedPortfolio,
        {
          // track user preferences
          'Selected Locale': selectedLocale,
          'Selected Currency': selectedCurrency,
          'Selected Currency Format': selectedCurrencyFormat,
        },
      ),
    ) // TODO(0xdef1cafe): restructure multiple wallets per user
    // don't track again for this wallet connection session
    setIsTracked(true)
  }, [
    anonymizedPortfolio,
    isDemoWallet,
    isMarketDataLoaded,
    isTracked,
    selectedCurrency,
    selectedCurrencyFormat,
    selectedLocale,
    walletId,
  ])

  useEffect(() => {
    // we've changed wallets, reset tracking
    setIsTracked(false)
  }, [walletId])
}
