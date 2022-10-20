import type { AssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { store } from 'state/store'

export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

export const filterAssetsBySearchTerm = (search: string, assetIds: AssetId[]) => {
  const assetsById = store.getState().assets.byId
  const assets = assetIds.map(assetId => assetsById[assetId])
  return matchSorter(assets, search, { keys: ['symbol', 'name'] }).map(({ assetId }) => assetId)
}
