import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectPortfolioMixedHumanBalancesBySymbol } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FiatRamp, supportedFiatRamps } from '../config'
import { FiatRampCurrency, FiatRampCurrencyWithBalances } from '../FiatRampsCommon'
import { isSupportedAsset } from '../utils'

export const useFiatRampCurrencyList = (fiatRampProvider: FiatRamp) => {
  const balances = useAppSelector(selectPortfolioMixedHumanBalancesBySymbol)

  const [loading, setLoading] = useState(false)
  const [buyList, setBuyList] = useState<FiatRampCurrency[]>([])
  const [sellList, setSellList] = useState<FiatRampCurrencyWithBalances[]>([])
  const {
    state: { wallet },
  } = useWallet()

  const addSellPropertiesAndSort = useCallback(
    (assets: FiatRampCurrency[]): FiatRampCurrencyWithBalances[] => {
      if (!wallet) return []
      return assets
        .filter(asset => Object.keys(balances).includes(asset.assetId))
        .map(asset => ({
          ...asset,
          disabled: !isSupportedAsset(asset?.assetId ?? '', wallet),
          cryptoBalance: bnOrZero(balances?.[asset.assetId]?.crypto),
          fiatBalance: bnOrZero(balances?.[asset.assetId]?.fiat),
        }))
        .sort((a, b) =>
          a.fiatBalance.gt(0) || b.fiatBalance.gt(0)
            ? b.fiatBalance.minus(a.fiatBalance).toNumber()
            : a.name.localeCompare(b.name),
        )
    },
    [balances, wallet],
  )

  const addBuyPropertiesAndSort = useCallback(
    (assets: FiatRampCurrency[]): FiatRampCurrency[] => {
      if (!wallet) return []
      return assets
        .map(asset => ({
          ...asset,
          disabled: !isSupportedAsset(asset.assetId, wallet),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    [wallet],
  )

  // start getting currencies from selected fiatRampProvider
  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const [parsedBuyList, parsedSellList] = await supportedFiatRamps[
        fiatRampProvider
      ].getBuyAndSellList()
      // only the sell list needs balances for sorting
      setSellList(addSellPropertiesAndSort(parsedSellList))
      setBuyList(addBuyPropertiesAndSort(parsedBuyList))
      setLoading(false)
    })()
  }, [fiatRampProvider, addSellPropertiesAndSort, addBuyPropertiesAndSort])

  return {
    loading,
    buyList,
    sellList,
  }
}
