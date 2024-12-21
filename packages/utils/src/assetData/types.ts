import type { AssetId } from '@shapeshiftoss/caip'

import type { FIELDS } from './constants'

export type Field = (typeof FIELDS)[number]

export type FieldToType = {
  assetIdx: number
  name: string
  precision: number
  color: string
  icon: string[]
  symbol: string
  relatedAssetKey: number | null
  isPool: 0 | 1 // stored as 0|1 to minimize JSON storage size
}

export type EncodedAsset = [
  FieldToType['assetIdx'],
  FieldToType['name'],
  FieldToType['precision'],
  FieldToType['color'],
  FieldToType['icon'],
  FieldToType['symbol'],
  FieldToType['relatedAssetKey'],
  FieldToType['isPool'],
]

export type EncodedAssetData = {
  assetIdPrefixes: string[]
  encodedAssetIds: string[]
  encodedAssets: EncodedAsset[]
}
