import type { EncodedAssetData } from '@shapeshiftmonorepo/utils'
import { decodeAssetData, decodeRelatedAssetIndex } from '@shapeshiftmonorepo/utils'

import encodedAssetData from './encodedAssetData.json'
import encodedRelatedAssetIndex from './encodedRelatedAssetIndex.json'

export const { assetData: localAssetData, sortedAssetIds } = decodeAssetData(
  encodedAssetData as unknown as EncodedAssetData,
)
export const relatedAssetIndex = decodeRelatedAssetIndex(encodedRelatedAssetIndex, sortedAssetIds)
