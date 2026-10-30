import '../loadEnv'

import type { AssetId } from '@shapeshiftoss/caip'
import type { AssetsById } from '@shapeshiftoss/types'
import crypto from 'crypto'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'
import path from 'path'

import { colorMap } from './coingecko'
import { compressGeneratedAssets } from './compressAssets'
import { ASSET_DATA_PATH, GENERATED_DIR, RELATED_ASSET_INDEX_PATH } from './constants'
import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'
import { getUnfilteredAssetData } from './getUnfilteredAssetData'
import { overrideAssets } from './overrides'
import { filterOutBlacklistedAssets, getSortedAssetIds } from './utils'

import { getAssetService } from '@/lib/asset-service'

// To regenerate all relatedAssetKey values, run: REGEN_ALL=true pnpm run generate:asset-data
const REGEN_ALL = process.env.REGEN_ALL === 'true'

const generateAssetData = async () => {
  await fs.promises.mkdir(GENERATED_DIR, { recursive: true })

  getAssetService()

  const unfilteredAssetData = await getUnfilteredAssetData()
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)
  const orderedAssetList = orderBy(filteredAssetData, 'assetId')

  let currentGeneratedAssetData: AssetsById = {}
  if (!REGEN_ALL) {
    try {
      const existingAssetDataJson = JSON.parse(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
      currentGeneratedAssetData = existingAssetDataJson.byId || {}
    } catch (err) {
      console.warn('No existing asset data found, doing full regeneration')
    }
  }

  const generatedAssetData = orderedAssetList.reduce<AssetsById>((acc, asset) => {
    const currentGeneratedAssetId = currentGeneratedAssetData[asset.assetId]

    // keep known related asset keys to avoid a refetch, but not null so those assets get re-checked
    if (
      !REGEN_ALL &&
      currentGeneratedAssetId?.relatedAssetKey &&
      currentGeneratedAssetId.relatedAssetKey !== null
    ) {
      asset.relatedAssetKey = currentGeneratedAssetId.relatedAssetKey
    }

    asset.color = colorMap[asset.assetId] ?? asset.color
    acc[asset.assetId] = asset

    return acc
  }, {})

  const assetsWithOverridesApplied = Object.entries(overrideAssets).reduce<AssetsById>(
    (prev, [assetId, asset]) => {
      if (prev[assetId]) prev[assetId] = merge(prev[assetId], asset)
      return prev
    },
    generatedAssetData,
  )

  const sortedAssetIds = await getSortedAssetIds(assetsWithOverridesApplied)

  const outputData = { byId: assetsWithOverridesApplied, ids: sortedAssetIds }
  await fs.promises.writeFile(ASSET_DATA_PATH, JSON.stringify(outputData))

  return { sortedAssetIds, assetData: assetsWithOverridesApplied }
}

const readRelatedAssetIndex = () => {
  const relatedAssetIndexJson = JSON.parse(fs.readFileSync(RELATED_ASSET_INDEX_PATH, 'utf8'))
  return relatedAssetIndexJson
}

const writeRelatedAssetIndex = (relatedAssetIndex: Record<AssetId, AssetId[]>) => {
  const filteredOutputData = Object.fromEntries(
    Object.entries(relatedAssetIndex).filter(([_, value]) => value !== undefined),
  )

  fs.writeFileSync(RELATED_ASSET_INDEX_PATH, JSON.stringify(filteredOutputData))
}

const generateManifest = async () => {
  const assetDataHash = crypto
    .createHash('sha256')
    .update(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
    .digest('hex')
    .slice(0, 8)

  const relatedAssetIndexHash = crypto
    .createHash('sha256')
    .update(await fs.promises.readFile(RELATED_ASSET_INDEX_PATH, 'utf8'))
    .digest('hex')
    .slice(0, 8)

  const manifest = {
    assetData: assetDataHash,
    relatedAssetIndex: relatedAssetIndexHash,
  }

  const manifestPath = path.join(GENERATED_DIR, 'asset-manifest.json')
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  console.info('Generated asset-manifest.json with content hashes')
}

const main = async () => {
  try {
    const originalRelatedAssetIndex = readRelatedAssetIndex()

    await generateAssetData()

    writeRelatedAssetIndex(originalRelatedAssetIndex)

    await generateRelatedAssetIndex()
    await generateManifest()
    await compressGeneratedAssets()

    console.info('Assets and related assets data generated.')

    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
