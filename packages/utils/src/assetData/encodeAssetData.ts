import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'

import { assertUnreachable } from '../assertUnreachable'
import { FIELDS } from './constants'
import type { EncodedAsset, EncodedAssetData, Field, FieldToType } from './types'

const encodeAssetIds = (sortedAssetIds: AssetId[]) => {
  const assetIdPrefixes: string[] = []
  const encodedAssetIds = []
  for (const assetId of sortedAssetIds) {
    // `indexOf` + `substring` faster than `split`
    const colonIndex = assetId.lastIndexOf(':')
    const prefix = assetId.substring(0, colonIndex)
    const assetReference = assetId.substring(colonIndex + 1)

    const prefixIdx = (() => {
      const prefixIdx = assetIdPrefixes.indexOf(prefix)

      if (prefixIdx !== -1) {
        return prefixIdx
      } else {
        assetIdPrefixes.push(prefix)
        return assetIdPrefixes.length - 1
      }
    })()

    encodedAssetIds.push(`${prefixIdx}:${assetReference}`)
  }

  return {
    assetIdPrefixes,
    encodedAssetIds,
  }
}

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

  // Should never happen, stfu typescript.
  throw Error('unhandled field type')
}

export const encodeAssetData = (
  sortedAssetIds: AssetId[],
  assetsById: AssetsById,
): EncodedAssetData => {
  const { assetIdPrefixes, encodedAssetIds } = encodeAssetIds(sortedAssetIds)

  const assetIdToAssetIdx = sortedAssetIds.reduce<Record<AssetId, number>>((acc, val, idx) => {
    acc[val] = idx
    return acc
  }, {})

  const encodedAssets: EncodedAsset[] = []
  for (let i = 0; i < encodedAssetIds.length; i++) {
    const assetId = sortedAssetIds[i]
    const asset = assetsById[assetId]
    const record = FIELDS.map(field => encodeField(field, assetIdToAssetIdx, asset)) as EncodedAsset
    encodedAssets.push(record)
  }

  return {
    assetIdPrefixes,
    encodedAssetIds,
    encodedAssets,
  }
}
