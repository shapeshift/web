import { useEffect, useState } from 'react'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { selectWalletId } from '@/state/slices/common-selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectIsMarketDataLoading, selectPortfolioAnonymized } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useMixpanelPortfolioTracking = () => {
  const anonymizedPortfolio = useAppSelector(selectPortfolioAnonymized)
  const [isTracked, setIsTracked] = useState(false)
  const isAnyMarketDataLoading = useAppSelector(selectIsMarketDataLoading)
  const walletId = useAppSelector(selectWalletId)
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const selectedCurrencyFormat = useAppSelector(preferences.selectors.selectCurrencyFormat)

  useEffect(() => {
    // only track once per wallet connection
    if (isTracked) return
    // only track if market data is loaded
    if (isAnyMarketDataLoading) return

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
    isAnyMarketDataLoading,
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
