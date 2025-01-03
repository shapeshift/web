import { decodeAssetData, decodeRelatedAssetIndex } from '@shapeshiftoss/utils'
import type { EncodedAssetData } from '@shapeshiftoss/utils/src/assetData/types'

import encodedAssetData from './encodedAssetData.json'
import encodedRelatedAssetIndex from './encodedRelatedAssetIndex.json'

export const { assetData: localAssetData, sortedAssetIds } = decodeAssetData(
  encodedAssetData as unknown as EncodedAssetData,
)
export const relatedAssetIndex = decodeRelatedAssetIndex(encodedRelatedAssetIndex, sortedAssetIds)
