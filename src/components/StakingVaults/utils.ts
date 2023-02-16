import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import type { Row } from 'react-table'
import { isEthAddress } from 'lib/address/utils'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { AggregatedOpportunitiesByAssetIdReturn } from 'state/slices/opportunitiesSlice/types'

export const getOverrideNameFromAssetId = (assetId: AssetId): string | null => {
  const overrideAssetIdNames: Record<AssetId, string> = {
    [foxEthLpAssetId]: 'ETH/FOX Pool',
  }
  return overrideAssetIdNames[assetId] ?? null
}

export const positionTableFilter = (
  rows: Row<AggregatedOpportunitiesByAssetIdReturn>[],
  filterValue: any,
  assets: Asset[],
) => {
  if (filterValue === '' || filterValue === null || filterValue === undefined) return rows
  if (typeof filterValue !== 'string') {
    return []
  }
  const search = filterValue.trim().toLowerCase()
  if (isEthAddress(filterValue)) {
    return rows.filter(
      row => fromAssetId(row.original.assetId).assetReference.toLowerCase() === filterValue,
    )
  }
  const assetIds = rows.map(row => row.original.assetId)
  const rowAssets = assets.filter(asset => assetIds.includes(asset.assetId))
  const matchedAssets = matchSorter(rowAssets, search, { keys: ['name', 'symbol'] }).map(
    asset => asset.assetId,
  )
  const results = rows.filter(row => matchedAssets.includes(row.original.assetId))
  return results
}
