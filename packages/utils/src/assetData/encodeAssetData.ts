import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'

import { assertUnreachable } from '../assertUnreachable'
import { FIELDS } from './constants'
import type { EncodedAsset, EncodedAssetData, Field, FieldToType } from './types'

const encodeField = <F extends Field>(
  field: F,
  assetIdToAssetIdx: Record<AssetId, number>,
  asset: Asset,
): FieldToType[F] => {
  switch (field) {
    case 'assetIdx':
      return assetIdToAssetIdx[asset.assetId] as FieldToType[F]
    case 'name':
      return asset.name as FieldToType[F]
    case 'precision':
      return asset.precision as FieldToType[F]
    case 'color':
      return asset.color as FieldToType[F]
    case 'icon':
      return (asset.icon ? [asset.icon] : asset.icons ?? []) as FieldToType[F]
    case 'symbol':
      return asset.symbol as FieldToType[F]
    case 'relatedAssetKey':
      return (
        !asset.relatedAssetKey ? null : assetIdToAssetIdx[asset.relatedAssetKey]
      ) as FieldToType[F]
    case 'isPool':
      return (asset.isPool ? 1 : 0) as FieldToType[F]
    default:
      assertUnreachable(field)
  }
}

export const encodeAssetData = (
  sortedAssetIds: AssetId[],
  assetsById: AssetsById,
): EncodedAssetData => {
  const assetIdToAssetIdx = sortedAssetIds.reduce<Record<AssetId, number>>((acc, val, idx) => {
    acc[val] = idx
    return acc
  }, {})

  const encodedAssets: EncodedAsset[] = []
  for (let i = 0; i < sortedAssetIds.length; i++) {
    const assetId = sortedAssetIds[i]
    const asset = assetsById[assetId]
    const record = FIELDS.map(field => encodeField(field, assetIdToAssetIdx, asset)) as EncodedAsset
    encodedAssets.push(record)
  }

  return {
    sortedAssetIds,
    encodedAssets,
  }
}
