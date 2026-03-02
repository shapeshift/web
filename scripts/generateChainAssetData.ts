import './loadEnv'

import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import crypto from 'crypto'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'
import path from 'path'

import { compressGeneratedAssets } from './generateAssetData/compressAssets'
import {
  ASSET_DATA_PATH,
  GENERATED_DIR,
  RELATED_ASSET_INDEX_PATH,
} from './generateAssetData/constants'
import { overrideAssets } from './generateAssetData/overrides'
import { filterOutBlacklistedAssets } from './generateAssetData/utils'

const GENERATE_ASSET_DATA_DIR = path.join(__dirname, 'generateAssetData')

const resolveChainModule = async (
  input: string,
): Promise<{ dirName: string; modulePath: string } | undefined> => {
  // First, try direct directory match (e.g., "linea")
  const directPath = path.join(GENERATE_ASSET_DATA_DIR, input)
  if (fs.existsSync(path.join(directPath, 'index.ts'))) {
    return { dirName: input, modulePath: directPath }
  }

  // Otherwise, treat as chainId (e.g., "eip155:59144") and scan modules.
  // Import each module and call getAssets() with a single asset to check the chainId.
  const dirs = fs
    .readdirSync(GENERATE_ASSET_DATA_DIR, { withFileTypes: true })
    .filter(
      d => d.isDirectory() && fs.existsSync(path.join(GENERATE_ASSET_DATA_DIR, d.name, 'index.ts')),
    )

  // Parse chainId constant name from module source to avoid importing everything.
  // Chain modules import e.g. `lineaChainId` from '@shapeshiftoss/caip'.
  // We resolve the constant to its value and match against the input.
  const caip = await import('@shapeshiftoss/caip')

  for (const dir of dirs) {
    const moduleSrc = fs.readFileSync(
      path.join(GENERATE_ASSET_DATA_DIR, dir.name, 'index.ts'),
      'utf8',
    )
    const match = moduleSrc.match(/(\w+ChainId)/)
    if (match) {
      const chainIdValue = (caip as Record<string, unknown>)[match[1]]
      if (chainIdValue === input) {
        return { dirName: dir.name, modulePath: path.join(GENERATE_ASSET_DATA_DIR, dir.name) }
      }
    }
  }

  return undefined
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

  const manifestPath = path.join(GENERATED_DIR, 'asset-manifest.json')
  await fs.promises.writeFile(
    manifestPath,
    JSON.stringify({ assetData: assetDataHash, relatedAssetIndex: relatedAssetIndexHash }, null, 2),
  )
}

const main = async () => {
  const input = process.argv[2]

  if (!input) {
    const dirs = fs
      .readdirSync(GENERATE_ASSET_DATA_DIR, { withFileTypes: true })
      .filter(
        d =>
          d.isDirectory() && fs.existsSync(path.join(GENERATE_ASSET_DATA_DIR, d.name, 'index.ts')),
      )
      .map(d => d.name)
      .sort()

    console.error('Usage: pnpm run generate:chain <chainId>')
    console.error('Example: pnpm run generate:chain eip155:59144')
    console.error(`\nAvailable chains: ${dirs.join(', ')}`)
    process.exit(1)
  }

  const resolved = await resolveChainModule(input)
  if (!resolved) {
    console.error(`Could not resolve chain module for "${input}"`)
    console.error('Pass a chainId (e.g., eip155:59144) or directory name (e.g., linea)')
    process.exit(1)
  }

  const { dirName, modulePath } = resolved
  console.info(`[generate:chain] fetching assets for ${dirName}...`)
  const chainModule: { getAssets: () => Promise<Asset[]> } = await import(modulePath)
  const newAssets = await chainModule.getAssets()

  if (newAssets.length === 0) {
    console.error('No assets returned from chain module')
    process.exit(1)
  }

  const chainId = newAssets[0].chainId
  console.info(`[generate:chain] chainId=${chainId}, fetched ${newAssets.length} assets`)

  const existingData: { byId: AssetsById; ids: AssetId[] } = JSON.parse(
    await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'),
  )

  const oldAssetIds = new Set(
    Object.entries(existingData.byId)
      .filter(([_, asset]) => asset.chainId === chainId)
      .map(([id]) => id),
  )

  for (const id of oldAssetIds) {
    delete existingData.byId[id]
  }

  const filteredAssets = filterOutBlacklistedAssets(newAssets)
  const orderedNewAssets = orderBy(filteredAssets, 'assetId')

  for (const asset of orderedNewAssets) {
    const existingAsset = oldAssetIds.has(asset.assetId)
      ? existingData.byId[asset.assetId]
      : undefined

    if (existingAsset?.relatedAssetKey && existingAsset.relatedAssetKey !== null) {
      asset.relatedAssetKey = existingAsset.relatedAssetKey
    }

    const override = overrideAssets[asset.assetId as keyof typeof overrideAssets]
    existingData.byId[asset.assetId] = override ? merge({}, asset, override) : asset
  }

  // Preserve existing sort order, append new assets at the end
  const existingIds = existingData.ids.filter(id => !oldAssetIds.has(id))
  const newAssetIds = orderedNewAssets.map(a => a.assetId)
  existingData.ids = [...existingIds, ...newAssetIds]

  console.info(
    `[generate:chain] replaced ${oldAssetIds.size} old assets with ${orderedNewAssets.length} new assets`,
  )

  await fs.promises.writeFile(ASSET_DATA_PATH, JSON.stringify(existingData, null, 2))

  // Generate related asset index for ONLY this chain's assets
  const { generateChainRelatedAssetIndex } = await import(
    './generateAssetData/generateRelatedAssetIndex/generateChainRelatedAssetIndex'
  )
  await generateChainRelatedAssetIndex(chainId)

  console.info('[generate:chain] generating manifest + compressing...')
  await generateManifest()
  await compressGeneratedAssets()

  console.info(`[generate:chain] done! ${dirName} (${chainId}) assets regenerated.`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
