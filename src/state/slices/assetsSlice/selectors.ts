import { createSelector } from '@reduxjs/toolkit'
import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import sortBy from 'lodash/sortBy'
import { ReduxState } from 'state/reducer'
import { selectMarketDataIds } from 'state/slices/selectors'

export const selectAssetByCAIP19 = createSelector(
  (state: ReduxState) => state.assets.byId,
  (_state: ReduxState, CAIP19: CAIP19) => CAIP19,
  (byId, CAIP19) => byId[CAIP19]
)

export const selectAssetNameById = createSelector(selectAssetByCAIP19, ({ name }) => name)

export const selectAssets = (state: ReduxState) => state.assets.byId
export const selectAssetIds = (state: ReduxState) => state.assets.ids

export const selectAssetsByMarketCap = createSelector(
  selectAssets,
  selectMarketDataIds,
  (assetsByIdOriginal, marketDataIds) => {
    const assetById = cloneDeep(assetsByIdOriginal)
    // we only prefetch market data for some
    // and want this to be fairly performant so do some mutatey things
    // market data ids are already sorted by market cap
    const sortedWithMarketCap = marketDataIds.reduce<Asset[]>((acc, cur) => {
      const asset = assetById[cur]
      if (!asset) return acc
      acc.push(asset)
      delete assetById[cur]
      return acc
    }, [])
    const remainingSortedNoMarketCap = sortBy(Object.values(assetById), ['name', 'symbol'])
    return [...sortedWithMarketCap, ...remainingSortedNoMarketCap]
  }
)

export const selectFeeAssetById = createSelector(
  selectAssets,
  (_state: ReduxState, assetId: CAIP19) => assetId,
  (assetsById, assetId): Asset => {
    const { chain, network } = caip19.fromCAIP19(assetId)
    const feeAssetId = caip19.toCAIP19({ chain, network })
    return assetsById[feeAssetId]
  }
)
