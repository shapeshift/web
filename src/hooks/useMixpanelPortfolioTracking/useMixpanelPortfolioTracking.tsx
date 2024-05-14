import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { selectWalletId } from 'state/slices/common-selectors'
import { selectIsMarketDataLoaded } from 'state/slices/marketDataSlice/selectors'
import {
  selectCurrencyFormat,
  selectPortfolioAnonymized,
  selectSelectedCurrency,
  selectSelectedLocale,
} from 'state/selectors'
import { useAppSelector } from 'state/store'

export const useMixpanelPortfolioTracking = () => {
  const anonymizedPortfolio = useAppSelector(selectPortfolioAnonymized)
  const [isTracked, setIsTracked] = useState(false)
  const { isDemoWallet } = useWallet().state
  const isMarketDataLoaded = useAppSelector(selectIsMarketDataLoaded)
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
