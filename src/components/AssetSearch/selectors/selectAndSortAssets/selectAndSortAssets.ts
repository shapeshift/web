import { CoinGeckoMarketCapResult } from '@shapeshiftoss/types'
import sortBy from 'lodash/sortBy'
import { createSelector } from 'reselect'
import { ReduxState } from 'state/reducer'
import { AssetsState, FullAsset } from 'state/slices/assetsSlice/assetsSlice'

export const selectAndSortAssets = createSelector(
  (state: ReduxState) => state.assets,
  (state: ReduxState) => state.marketData.marketCap,
  (assets: AssetsState, marketCap?: CoinGeckoMarketCapResult) => {
    let sortedAssets: FullAsset[] = []
    const assetsEntries = Object.entries(assets)
    if (marketCap) {
      // we only fetch market data for the top 250 assets
      // and want this to be fairly performant so do some mutatey things
      const assetsByCAIP19 = assetsEntries.reduce<Record<string, FullAsset>>((acc, [, cur]) => {
        acc[cur.caip19] = cur
        return acc
      }, {})
      const caip19ByMarketCap = Object.keys(marketCap)
      const sortedWithMarketCap = caip19ByMarketCap.reduce<FullAsset[]>((acc, cur) => {
        const asset = assetsByCAIP19[cur]
        if (!asset) return acc
        acc.push(asset)
        delete assetsByCAIP19[cur]
        return acc
      }, [])
      const remainingSortedNoMarketCap = sortBy(Object.values(assetsByCAIP19), ['name', 'symbol'])
      sortedAssets = [...sortedWithMarketCap, ...remainingSortedNoMarketCap]
    } else {
      if (assetsEntries.length > 0) {
        const data = assetsEntries.map(([, val]) => {
          return val
        })
        sortedAssets = sortBy(data, ['name', 'symbol'])
      }
    }
    return sortedAssets
  }
)
