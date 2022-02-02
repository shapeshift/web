import { Asset } from '@shapeshiftoss/types'
import { matchSorter } from 'match-sorter'
import { isEthAddress } from 'lib/utils'

export const filterAssetsBySearchTerm = (search: string, assets: Asset[]) => {
  if (!assets) return []

  const searchLower = search.toLowerCase()

  if (isEthAddress(search)) {
    return assets.filter(asset => asset?.tokenId?.toLowerCase() === searchLower)
  }

  return matchSorter(assets, search, { keys: ['name', 'symbol'] })
}
