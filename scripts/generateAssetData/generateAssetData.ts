import '../loadEnv'

import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import {
  atom,
  bitcoin,
  bitcoincash,
  decodeAssetData,
  decodeRelatedAssetIndex,
  dogecoin,
  encodeAssetData,
  encodeRelatedAssetIndex,
  litecoin,
  maya,
  mayachain,
  ruji,
  tcy,
  thorchain,
  unfreeze,
  zcash,
} from '@shapeshiftoss/utils'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'

import * as arbitrum from './arbitrum'
import * as arbitrumNova from './arbitrumNova'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bnbsmartchain from './bnbsmartchain'
import { ASSET_DATA_PATH, RELATED_ASSET_INDEX_PATH } from './constants'
import * as ethereum from './ethereum'
import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'
import * as gnosis from './gnosis'
import * as hyperevm from './hyperevm'
import * as monad from './monad'
import * as optimism from './optimism'
import { overrideAssets } from './overrides'
import * as plasma from './plasma'
import * as polygon from './polygon'
import * as solana from './solana'
import * as sui from './sui'
import * as tronModule from './tron'
import { filterOutBlacklistedAssets, getSortedAssetIds } from './utils'

// To regenerate all relatedAssetKey values, run: REGEN_ALL=true yarn generate:asset-data
const REGEN_ALL = process.env.REGEN_ALL === 'true'

const generateAssetData = async () => {
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
  const tronAssets = await tronModule.getAssets()
  const suiAssets = await sui.getAssets()

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
    ...tronAssets,
    ...suiAssets,
  ]

  // remove blacklisted assets
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredAssetData, 'assetId')

  const encodedAssetData = JSON.parse(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
  const { assetData: currentGeneratedAssetData } = decodeAssetData(encodedAssetData)

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

  // Encode the assets for minimal size while preserving ordering
  const reEncodedAssetData = encodeAssetData(sortedAssetIds, assetsWithOverridesApplied)
  await fs.promises.writeFile(ASSET_DATA_PATH, JSON.stringify(reEncodedAssetData))

  return { sortedAssetIds, assetData: assetsWithOverridesApplied }
}

const readRelatedAssetIndex = () => {
  const encodedAssetData = JSON.parse(fs.readFileSync(ASSET_DATA_PATH, 'utf8'))
  const encodedRelatedAssetIndex = JSON.parse(fs.readFileSync(RELATED_ASSET_INDEX_PATH, 'utf8'))

  const { sortedAssetIds: originalSortedAssetIds } = decodeAssetData(encodedAssetData)
  const relatedAssetIndex = decodeRelatedAssetIndex(
    encodedRelatedAssetIndex,
    originalSortedAssetIds,
  )

  return relatedAssetIndex
}

const reEncodeAndWriteRelatedAssetIndex = (
  originalRelatedAssetIndex: Record<AssetId, AssetId[]>,
  updatedSortedAssetIds: AssetId[],
) => {
  const updatedEncodedRelatedAssetIndex = encodeRelatedAssetIndex(
    originalRelatedAssetIndex,
    updatedSortedAssetIds,
  )

  // Remove any undefined values from the updated encoded related asset index
  const filteredUpdatedEncodedRelatedAssetIndex = Object.fromEntries(
    Object.entries(updatedEncodedRelatedAssetIndex).filter(([_, value]) => value !== undefined),
  )

  fs.writeFileSync(
    RELATED_ASSET_INDEX_PATH,
    JSON.stringify(filteredUpdatedEncodedRelatedAssetIndex),
  )
}

const main = async () => {
  try {
    // Read the original related asset index
    const originalRelatedAssetIndex = readRelatedAssetIndex()

    // Generate the new assetData and sortedAssetIds
    const { sortedAssetIds: updatedSortedAssetIds } = await generateAssetData()

    // We need to update the relatedAssetIndex to match the new asset ordering:
    // - The original relatedAssetIndex references assets by their index in the original
    //   sortedAssetIds array
    // - After regenerating assetData, the positions in the sortedAssetIds may have changed, which
    //   means a given index in the relatedAssetIndex will point to a different asset in the new
    //   sortedAssetIds
    // - To prevent corruption, we rewrite the relatedAssetIndex using the new positions, resulting
    //   in a new relatedAssetIndex that references assets by their index in the updated
    //   sortedAssetIds
    reEncodeAndWriteRelatedAssetIndex(originalRelatedAssetIndex, updatedSortedAssetIds)

    // Generate the new related asset index
    await generateRelatedAssetIndex()

    console.info('Assets and related assets data generated.')

    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
