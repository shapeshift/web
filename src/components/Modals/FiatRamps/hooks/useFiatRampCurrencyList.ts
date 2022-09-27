import { uniqBy } from 'lodash'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetFiatRampAssetsQuery } from 'state/apis/fiatRamps/fiatRamps'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import { selectAssets, selectPortfolioMixedHumanBalancesBySymbol } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { FiatRampAsset } from '../FiatRampsCommon'

export const useFiatRampCurrencyList = () => {
  const balances = useAppSelector(selectPortfolioMixedHumanBalancesBySymbol)
  const assets = useAppSelector(selectAssets)

  const { data: fiatRampData, isLoading: isFiatRampDataLoading } = useGetFiatRampAssetsQuery()
  const [loading, setLoading] = useState(isFiatRampDataLoading)
  const [buyList, setBuyList] = useState<FiatRampAsset[]>([])
  const [sellList, setSellList] = useState<FiatRampAsset[]>([])
  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    if (!fiatRampData) return
    if (!wallet) return
    setLoading(true)
    const initial: [FiatRampAsset[], FiatRampAsset[]] = [[], []]
    const [allBuyAssets, allSellAssets] = Object.values(fiatRampData).reduce((acc, cur) => {
      acc[0].push(...cur.buy)
      acc[1].push(...cur.sell)
      return acc
    }, initial)
    const uniqueBuyAssets = uniqBy(allBuyAssets, 'assetId')
    const uniqueSellAssets = uniqBy(allSellAssets, 'assetId')
    const augmentFn = (fiatRampAsset: FiatRampAsset) => {
      const { assetId } = fiatRampAsset
      const asset = assets[assetId]
      const disabled = !isAssetSupportedByWallet(assetId, wallet)
      const cryptoBalance = bnOrZero(balances[assetId]?.crypto)
      const fiatBalance = bnOrZero(balances[assetId]?.fiat)
      return {
        ...fiatRampAsset,
        ...asset,
        disabled,
        cryptoBalance,
        fiatBalance,
      }
    }

    // we've just augmented them with balances, don't know of a better way to narrow type
    const sortFn = (a: FiatRampAsset, b: FiatRampAsset): number =>
      a.fiatBalance!.gt(0) || b.fiatBalance!.gt(0)
        ? b.fiatBalance!.minus(a.fiatBalance!)?.toNumber()
        : a.name.localeCompare(b.name)

    const augmentedBuyAssets = uniqueBuyAssets.map(augmentFn).sort(sortFn)
    const augmentedSellAssets = uniqueSellAssets.map(augmentFn).sort(sortFn)
    setBuyList(augmentedBuyAssets)
    setSellList(augmentedSellAssets)
    setLoading(false)
  }, [assets, balances, fiatRampData, wallet])

  return {
    loading,
    buyList,
    sellList,
  }
}
