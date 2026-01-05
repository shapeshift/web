import '../loadEnv'

import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import {
  atom,
  bitcoin,
  bitcoincash,
  dogecoin,
  litecoin,
  maya,
  mayachain,
  ruji,
  tcy,
  thorchain,
  unfreeze,
  zcash,
} from '@shapeshiftoss/utils'
import crypto from 'crypto'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'
import path from 'path'

import * as arbitrum from './arbitrum'
import * as arbitrumNova from './arbitrumNova'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bnbsmartchain from './bnbsmartchain'
import { ASSET_DATA_PATH, GENERATED_DIR, RELATED_ASSET_INDEX_PATH } from './constants'
import * as ethereum from './ethereum'
import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'
import * as gnosis from './gnosis'
import * as hyperevm from './hyperevm'
import * as monad from './monad'
import * as near from './near'
import * as optimism from './optimism'
import { overrideAssets } from './overrides'
import * as plasma from './plasma'
import * as polygon from './polygon'
import * as solana from './solana'
import * as starknet from './starknet'
import * as sui from './sui'
import * as tronModule from './tron'
import { filterOutBlacklistedAssets, getSortedAssetIds } from './utils'

import { getAssetService } from '@/lib/asset-service'

// To regenerate all relatedAssetKey values, run: REGEN_ALL=true yarn generate:asset-data
const REGEN_ALL = process.env.REGEN_ALL === 'true'

const generateAssetData = async () => {
  // Ensure the generated directory exists
  await fs.promises.mkdir(GENERATED_DIR, { recursive: true })

  // Initialize AssetService with existing data (needed by portals and other asset generators)
  await getAssetService()

  const ethAssets = await ethereum.getAssets()
  const avalancheAssets = await avalanche.getAssets()
  const optimismAssets = await optimism.getAssets()
  const bnbsmartchainAssets = await bnbsmartchain.getAssets()
  const polygonAssets = await polygon.getAssets()
  const gnosisAssets = await gnosis.getAssets()
  const arbitrumAssets = await arbitrum.getAssets()
  const arbitrumNovaAssets = await arbitrumNova.getAssets()
  const baseAssets = await base.getAssets()
  const monadAssets = await monad.getAssets()
  const hyperevmAssets = await hyperevm.getAssets()
  const plasmaAssets = await plasma.getAssets()
  const solanaAssets = await solana.getAssets()
  const starknetAssets = await starknet.getAssets()
  const tronAssets = await tronModule.getAssets()
  const suiAssets = await sui.getAssets()
  const nearAssets = await near.getAssets()

  // all assets, included assets to be blacklisted
  const unfilteredAssetData: Asset[] = [
    unfreeze(bitcoin),
    unfreeze(bitcoincash),
    unfreeze(dogecoin),
    unfreeze(litecoin),
    unfreeze(zcash),
    unfreeze(atom),
    unfreeze(thorchain),
    unfreeze(tcy),
    unfreeze(ruji),
    unfreeze(mayachain),
    unfreeze(maya),
    ...ethAssets,
    ...avalancheAssets,
    ...optimismAssets,
    ...bnbsmartchainAssets,
    ...polygonAssets,
    ...gnosisAssets,
    ...arbitrumAssets,
    ...arbitrumNovaAssets,
    ...baseAssets,
    ...monadAssets,
    ...hyperevmAssets,
    ...plasmaAssets,
    ...solanaAssets,
    ...starknetAssets,
    ...tronAssets,
    ...suiAssets,
    ...nearAssets,
  ]

  // remove blacklisted assets
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)

  // deterministic order so diffs are readable
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
    // Ensures we don't overwrite existing relatedAssetIndex with the generated one, triggering a refetch
    // Only preserve actual AssetId values, not null (null means "checked but no related assets found")
    // By not preserving null, we allow re-checking when upstream providers add new platforms
    if (
      !REGEN_ALL &&
      currentGeneratedAssetId?.relatedAssetKey &&
      currentGeneratedAssetId.relatedAssetKey !== null
    ) {
      asset.relatedAssetKey = currentGeneratedAssetId.relatedAssetKey
    }

    acc[asset.assetId] = asset
    return acc
  }, {})

  // do this last such that manual overrides take priority
  const assetsWithOverridesApplied = Object.entries(overrideAssets).reduce<AssetsById>(
    (prev, [assetId, asset]) => {
      if (prev[assetId]) prev[assetId] = merge(prev[assetId], asset)
      return prev
    },
    generatedAssetData,
  )

  // Temporary workaround to circumvent the fact that no lists have that asset currently
  const foxOnArbitrumOne = {
    assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
    chainId: 'eip155:42161',
    name: 'FOX',
    precision: 18,
    color: '#3761F9',
    icon: '/fox-token-logo.png',
    symbol: 'FOX',
    explorer: 'https://arbiscan.io',
    explorerAddressLink: 'https://arbiscan.io/address/',
    explorerTxLink: 'https://arbiscan.io/tx/',
    relatedAssetKey: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
  }
  assetsWithOverridesApplied[foxOnArbitrumOneAssetId] = foxOnArbitrumOne

  const sortedAssetIds = await getSortedAssetIds(assetsWithOverridesApplied)

  const outputData = { byId: assetsWithOverridesApplied, ids: sortedAssetIds }
  await fs.promises.writeFile(ASSET_DATA_PATH, JSON.stringify(outputData, null, 2))

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

  fs.writeFileSync(RELATED_ASSET_INDEX_PATH, JSON.stringify(filteredOutputData, null, 2))
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
    // Read the original related asset index
    const originalRelatedAssetIndex = readRelatedAssetIndex()

    // Generate the new assetData and sortedAssetIds
    await generateAssetData()

    // Write the related asset index
    writeRelatedAssetIndex(originalRelatedAssetIndex)

    // Generate the new related asset index
    await generateRelatedAssetIndex()

    // Generate manifest with content hashes for cache busting
    await generateManifest()

    console.info('Assets and related assets data generated.')

    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
