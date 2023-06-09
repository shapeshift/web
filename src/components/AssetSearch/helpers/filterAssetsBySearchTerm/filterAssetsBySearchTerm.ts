import { fromAssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { isEthAddress } from 'lib/address/utils'
import type { Asset } from 'lib/asset-service'

export const filterAssetsBySearchTerm = (search: string, assets: Asset[]) => {
  if (!assets) return []

  const searchLower = search.toLowerCase()

  if (isEthAddress(search)) {
    return assets.filter(
      asset => fromAssetId(asset?.assetId).assetReference.toLowerCase() === searchLower,
    )
  }

  return matchSorter(assets, search, { keys: ['name', 'symbol'] })
}
