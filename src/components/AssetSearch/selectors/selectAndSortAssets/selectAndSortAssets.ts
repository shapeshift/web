import sortBy from 'lodash/sortBy'
import { createSelector } from 'reselect'
import { ReduxState } from 'state/reducer'
import { AssetsState, FullAsset } from 'state/slices/assetsSlice/assetsSlice'

export const selectAndSortAssets = createSelector(
  (state: ReduxState) => state.assets,
  (assets: AssetsState) => {
    let sortedAssets: FullAsset[] = []
    const assetsEntries = Object.entries(assets)
    if (assetsEntries.length > 0) {
      const data = assetsEntries.map(([, val]) => {
        return val
      })
      sortedAssets = sortBy(data, ['name', 'symbol'])
    }
    return sortedAssets
  }
)
