import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { pick } from 'lodash'

import { assertUnreachable } from '../assertUnreachable'
import { FIELDS } from './constants'
import { getBaseAsset } from './getBaseAsset'
import type { EncodedAssetData, FieldToType } from './types'

export const decodeAssetData = (encodedAssetData: EncodedAssetData) => {
  const { sortedAssetIds, encodedAssets } = encodedAssetData

  const assetData = encodedAssets.reduce<Record<AssetId, Asset>>((acc, encodedAsset, idx) => {
    const assetId = sortedAssetIds[idx]
    const { chainId } = fromAssetId(assetId)

    const baseAsset = getBaseAsset(chainId)
    // Initialize with default values for the chain
    const asset: Asset = Object.assign(
      {
        assetId,
        chainId,
        symbol: '',
        name: '',
        precision: 0,
        color: '',
        icon: undefined,
        explorer: '',
        explorerAddressLink: '',
        explorerTxLink: '',
        relatedAssetKey: null,
      },
      pick(baseAsset, ['explorer', 'explorerAddressLink', 'explorerTxLink']),
    )

    // Apply each field's decoded value to the asset
    FIELDS.forEach((field, fieldIdx) => {
      const value = encodedAsset[fieldIdx]

      switch (field) {
        case 'icon': {
          const typedValue = value as FieldToType[typeof field]
          if (typedValue.length === 1) {
            asset.icon = typedValue[0]
          } else if (typedValue.length > 1) {
            asset.icons = typedValue
          }
          break
        }
        case 'relatedAssetKey': {
          const typedValue = value as FieldToType[typeof field]
          asset.relatedAssetKey = typedValue === null ? null : sortedAssetIds[typedValue]
          break
        }
        case 'name':
          asset.name = value as FieldToType[typeof field]
          break
        case 'precision':
          asset.precision = value as FieldToType[typeof field]
          break
        case 'color':
          asset.color = value as FieldToType[typeof field]
          break
        case 'symbol':
          asset.symbol = value as FieldToType[typeof field]
          break
        case 'isPool':
          if ((value as FieldToType[typeof field]) === 1) {
            asset.isPool = true
          }
          break
        case 'assetIdx':
          // Skip assetIdx as we already have assetId
          break
        default:
          assertUnreachable(field)
      }
    })

    acc[assetId] = asset
    return acc
  }, {})

  return {
    assetData,
    sortedAssetIds,
  }
}
