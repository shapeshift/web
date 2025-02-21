import { fromAssetId } from '@shapeshiftmonorepo/caip'
import type { Asset } from '@shapeshiftmonorepo/types'
import { matchSorter } from 'match-sorter'
import { isEthAddress } from 'lib/address/utils'

export const filterAssetsBySearchTerm = (search: string, assets: Asset[]) => {
  if (!assets) return []

  const searchLower = search.toLowerCase()

  if (isEthAddress(search)) {
    return assets.filter(
      asset => fromAssetId(asset?.assetId).assetReference.toLowerCase() === searchLower,
    )
  }

  return matchSorter(assets, search, {
    keys: ['name', 'symbol'],
    threshold: matchSorter.rankings.CONTAINS,
  })
}
