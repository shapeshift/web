import type { AssetId } from '@shapeshiftoss/caip'
import type { AssetsById } from '@shapeshiftoss/types'

import generatedAssetData from './generatedAssetData.json'
import generatedRelatedAssetIndex from './relatedAssetIndex.json'

export const localAssetData = generatedAssetData as unknown as AssetsById
export const relatedAssetIndex = generatedRelatedAssetIndex as Record<AssetId, AssetId[]>
