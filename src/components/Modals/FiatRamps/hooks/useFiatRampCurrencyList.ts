import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import { selectAssets, selectPortfolioMixedHumanBalancesBySymbol } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FiatRamp, supportedFiatRamps } from '../config'
import { FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'hooks', 'useFiatRampCurrencyList'],
})

export const useFiatRampCurrencyList = (fiatRampProvider: FiatRamp) => {
  const balances = useAppSelector(selectPortfolioMixedHumanBalancesBySymbol)
  const reduxAssets = useAppSelector(selectAssets)

  const [loading, setLoading] = useState(false)
  const [buyList, setBuyList] = useState<FiatRampAsset[]>([])
  const [sellList, setSellList] = useState<FiatRampAsset[]>([])
  const {
    state: { wallet },
  } = useWallet()

  const addSellPropertiesAndSort = useCallback(
    (assets: FiatRampAsset[]): FiatRampAsset[] => {
      try {
        if (!wallet) return []
        return assets
          .filter(asset => Object.keys(balances).includes(asset.assetId))
          .map(asset => {
            const reduxAsset = reduxAssets[asset.assetId]
            const fiatBalance = bnOrZero(balances?.[asset.assetId]?.fiat)
            const minimumSellThreshold = bnOrZero(
              supportedFiatRamps[fiatRampProvider].minimumSellThreshold ?? 0,
            )
            return {
              ...asset,
              name: reduxAsset.name,
              symbol: reduxAsset.symbol,
              disabled: !isAssetSupportedByWallet(asset?.assetId ?? '', wallet),
              cryptoBalance: bnOrZero(balances?.[asset.assetId]?.crypto),
              fiatBalance,
              isBelowSellThreshold: fiatBalance.lt(minimumSellThreshold),
            }
          })
          .sort((a, b) =>
            a.fiatBalance.gt(0) || b.fiatBalance.gt(0)
              ? b.fiatBalance.minus(a.fiatBalance).toNumber()
              : a.name.localeCompare(b.name),
          )
      } catch (err) {
        moduleLogger.error(
          err,
          { fn: 'addSellPropertiesAndSort' },
          'An error happened sorting the fiat ramp sell assets',
        )
        return []
      }
    },
    [balances, fiatRampProvider, reduxAssets, wallet],
  )

  const addBuyPropertiesAndSort = useCallback(
    (assets: FiatRampAsset[]): FiatRampAsset[] => {
      if (!wallet) return []
      try {
        return assets
          .map(asset => {
            const reduxAsset = reduxAssets[asset.assetId]
            if (!reduxAsset) {
              return {
                ...asset,
                disabled: true,
              }
            }

            return {
              ...asset,
              name: reduxAsset.name,
              symbol: reduxAsset.symbol,
              disabled: !isAssetSupportedByWallet(asset.assetId, wallet),
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))
      } catch (err) {
        moduleLogger.error(
          err,
          { fn: 'addBuyPropertiesAndSort' },
          'An error happened sorting the fiat ramp buy assets',
        )
        return []
      }
    },
    [reduxAssets, wallet],
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
