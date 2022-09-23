import { avalancheAssetId } from '@shapeshiftoss/caip'
import { uniqBy } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import { selectAssets, selectPortfolioMixedHumanBalancesBySymbol } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { supportedFiatRamps } from '../config'
import type { FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'hooks', 'useFiatRampCurrencyList'],
})

export const useFiatRampCurrencyList = () => {
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
            return {
              ...asset,
              name: reduxAsset.name,
              symbol: reduxAsset.symbol,
              disabled: !isAssetSupportedByWallet(asset?.assetId ?? '', wallet),
              cryptoBalance: bnOrZero(balances?.[asset.assetId]?.crypto),
              fiatBalance,
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
    [balances, reduxAssets, wallet],
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
                symbol: asset.symbol.toUpperCase(),
                // TODO: Monkey patch, remove after REACT_APP_FEATURE_AVALANCHE is enabled/removed
                ...(asset.assetId === avalancheAssetId
                  ? {
                      name: 'Avalanche',
                      imageUrl:
                        'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/avalanchec/info/logo.png',
                    }
                  : {}),
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
    async function getBySellAssets() {
      const [parsedBuyList, parsedSellList] = (
        await Promise.allSettled(
          Object.values(supportedFiatRamps)
            .filter(provider => provider.isImplemented)
            .map(async provider => {
              return await provider.getBuyAndSellList()
            }),
        )
      ).reduce<[currentBuyList: FiatRampAsset[], currentSellList: FiatRampAsset[]]>(
        (acc, getBySellAssetsPromise) => {
          if (getBySellAssetsPromise.status === 'rejected') {
            moduleLogger.error(
              getBySellAssetsPromise?.reason,
              { fn: 'getBySellAssets' },
              'An error happened sorting the fiat ramp buy assets',
            )
            return acc
          }
          const { value } = getBySellAssetsPromise
          const [currentBuyList, currentSellList] = value
          acc[0].push(...currentBuyList)
          acc[1].push(...currentSellList)
          return acc
        },
        [[], []],
      )
      setSellList(addSellPropertiesAndSort(uniqBy(parsedSellList, 'assetId')))
      setBuyList(addBuyPropertiesAndSort(uniqBy(parsedBuyList, 'assetId')))
      setLoading(false)
    }
    getBySellAssets()
    // ;(async () => {
    //   const [parsedBuyList, parsedSellList] = await supportedFiatRamps[
    //     fiatRampProvider
    //   ].getBuyAndSellList()
    //   // only the sell list needs balances for sorting
    //   setSellList(addSellPropertiesAndSort(parsedSellList))
    //   setBuyList(addBuyPropertiesAndSort(parsedBuyList))

    // })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSellPropertiesAndSort, addBuyPropertiesAndSort])

  return {
    loading,
    buyList,
    sellList,
  }
}
