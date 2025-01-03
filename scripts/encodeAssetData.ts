import { encodeAssetData, encodeRelatedAssetIndex } from '@shapeshiftoss/utils'
import fs from 'fs'

import {
  ASSET_DATA_PATH,
  LEGACY_ASSET_DATA_PATH,
  LEGACY_RELATED_ASSET_INDEX_PATH,
  RELATED_ASSET_INDEX_PATH,
} from './generateAssetData/constants'
import { getSortedAssetIds } from './generateAssetData/utils'

// TODO: Remove me when migration to encoded asset data complete
// Upgrades the asset data and related asset index to the encoded format.
const main = async () => {
  const assetData = JSON.parse(fs.readFileSync(LEGACY_ASSET_DATA_PATH, 'utf8'))
  const relatedAssetIndex = JSON.parse(fs.readFileSync(LEGACY_RELATED_ASSET_INDEX_PATH, 'utf8'))

  const sortedAssetIds = await getSortedAssetIds(assetData)

  const reEncodedRelatedAssetIndex = encodeRelatedAssetIndex(relatedAssetIndex, sortedAssetIds)
  const reEncodedAssetData = encodeAssetData(sortedAssetIds, assetData)

  await fs.promises.writeFile(ASSET_DATA_PATH, JSON.stringify(reEncodedAssetData))
  await fs.promises.writeFile(RELATED_ASSET_INDEX_PATH, JSON.stringify(reEncodedRelatedAssetIndex))
}

main()
