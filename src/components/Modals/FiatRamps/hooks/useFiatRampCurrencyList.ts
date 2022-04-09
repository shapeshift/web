import { useEffect, useState } from 'react'
import { selectPortfolioMixedHumanBalancesBySymbol } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FiatRamps, supportedFiatRamps } from '../config'

export const useFiatRampCurrencyList = (
  fiatRampProvider: FiatRamps,
  walletSupportsBTC: boolean,
) => {
  const balances = useAppSelector(selectPortfolioMixedHumanBalancesBySymbol)

  const [loading, setLoading] = useState(false)
  const [buyList, setBuyList] = useState<any>([])
  const [sellList, setSellList] = useState<any>([])

  // start getting currencies from selected fiatRampProvider
  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const [parsedBuyList, parsedSellList] = await supportedFiatRamps[
        fiatRampProvider
      ].getBuyAndSellList(walletSupportsBTC, balances)
      setBuyList(parsedBuyList)
      setSellList(parsedSellList)
      setLoading(false)
    })()
  }, [walletSupportsBTC, balances, fiatRampProvider])

  return {
    loading,
    buyList,
    sellList,
  }
}
