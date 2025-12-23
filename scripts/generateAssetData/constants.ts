import path from 'path'

export const GENERATED_DIR = path.join(__dirname, '../../public/generated')

export const ASSET_DATA_PATH = path.join(GENERATED_DIR, 'generatedAssetData.json')

export const RELATED_ASSET_INDEX_PATH = path.join(GENERATED_DIR, 'relatedAssetIndex.json')
