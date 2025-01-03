import path from 'path'

// TODO: Remove me when migration to encoded asset data complete
export const LEGACY_ASSET_DATA_PATH = path.join(
  __dirname,
  '../../src/lib/asset-service/service/generatedAssetData.json',
)

// TODO: Remove me when migration to encoded asset data complete
export const LEGACY_RELATED_ASSET_INDEX_PATH = path.join(
  __dirname,
  '../../src/lib/asset-service/service/relatedAssetIndex.json',
)

export const ASSET_DATA_PATH = path.join(
  __dirname,
  '../../src/lib/asset-service/service/encodedAssetData.json',
)

export const RELATED_ASSET_INDEX_PATH = path.join(
  __dirname,
  '../../src/lib/asset-service/service/encodedRelatedAssetIndex.json',
)
