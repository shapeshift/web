import type { AssetId } from '@shapeshiftoss/caip'
import intersection from 'lodash/intersection'
import { selectPortfolioAssetIdsSortedFiat } from 'state/slices/selectors'
import { store } from 'state/store'

export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

export const filterAssetsBySearchTerm = (search: string, assetIds: AssetId[]) => {
  const state = store.getState()
  const assetsById = state.assets.byId
  const portfolioAssetIdsSortedFiat = selectPortfolioAssetIdsSortedFiat(state)
  const actionableAssetIdsSortedFiat = intersection(portfolioAssetIdsSortedFiat, assetIds)
  const uniqueSortedAssetIds = Array.from(new Set([...actionableAssetIdsSortedFiat, ...assetIds]))
  const assets = uniqueSortedAssetIds.map(assetId => assetsById[assetId]).filter(Boolean)
  return assets
    .filter(asset => `${asset?.name}${asset?.symbol}`.toLowerCase().includes(search.toLowerCase()))
    .map(({ assetId }) => assetId)
}
