import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { pick } from 'lodash'

import { assertUnreachable } from '../assertUnreachable'
import { FIELDS } from './constants'
import { getBaseAsset } from './getBaseAsset'
import type { EncodedAssetData, FieldToType } from './types'

const decodeAssetId = (encodedAssetId: string, assetIdPrefixes: string[]) => {
  // Performance sensitive. `lastIndexOf` + `substring` faster than `split`
  const colonIndex = encodedAssetId.lastIndexOf(':')
  const prefixIdx = Number(encodedAssetId.substring(0, colonIndex))
  const assetReference = encodedAssetId.substring(colonIndex + 1)

  // Performance sensitive. String concatenation faster than template literal
  return assetIdPrefixes[prefixIdx] + ':' + assetReference
}

export const decodeAssetData = (encodedAssetData: EncodedAssetData) => {
  const { assetIdPrefixes, encodedAssetIds, encodedAssets } = encodedAssetData

  const sortedAssetIds: AssetId[] = encodedAssetIds.map(encodedAssetId =>
    decodeAssetId(encodedAssetId, assetIdPrefixes),
  )

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

    if (assetId === baseAsset?.assetId) {
      asset.networkName = baseAsset.networkName
      asset.networkIcon = baseAsset.networkIcon
      asset.networkColor = baseAsset.networkColor
    }

    // Apply each field's decoded value to the asset
    FIELDS.forEach((field, fieldIdx) => {
      const value = encodedAsset[fieldIdx]

      switch (field) {
        case 'icon': {
          const iconOrIcons = value as FieldToType[typeof field]
          if (iconOrIcons.length === 1) {
            asset.icon = iconOrIcons[0]
          } else if (iconOrIcons.length > 1) {
            asset.icons = iconOrIcons
          }
          break
        }
        case 'relatedAssetKey': {
          const assetIdx = value as FieldToType[typeof field]
          const relatedAssetId = assetIdx === null ? null : sortedAssetIds[assetIdx]
          // if (relatedAssetId === undefined) throw Error()
          asset.relatedAssetKey = relatedAssetId
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
        case 'isPool': {
          const isPool = value as FieldToType[typeof field]
          if (isPool) {
            asset.isPool = true
          }
          break
        }
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
