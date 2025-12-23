import type { AssetId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumAssetId,
  arbitrumNovaAssetId,
  baseAssetId,
  ethAssetId,
  FEE_ASSET_IDS,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAssetId,
  optimismAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { createThrottle, isToken } from '@shapeshiftoss/utils'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'

import { ASSET_DATA_PATH, RELATED_ASSET_INDEX_PATH } from '../constants'
import {
  coingeckoPlatformDetailsToMaybeAssetId,
  zerionImplementationToMaybeAssetId,
} from './mapping'
import { zerionFungiblesSchema } from './validators/fungible'

import type { CoingeckoAssetDetails } from '@/lib/coingecko/types'
import type { CoinGeckoMarketCap } from '@/lib/market-service/coingecko/coingecko-types'
import type { PartialFields } from '@/lib/types'

// NOTE: this must call the zerion api directly rather than our proxy because of rate limiting requirements
const ZERION_BASE_URL = 'https://api.zerion.io/v1'
const BATCH_SIZE = 100

const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'

const axiosInstance = axios.create()
axiosRetry(axiosInstance, { retries: 5, retryDelay: axiosRetry.exponentialDelay })

const ZERION_API_KEY = process.env.ZERION_API_KEY
if (!ZERION_API_KEY) throw new Error('Missing Zerion API key - see readme for instructions')

const REGEN_ALL = process.env.REGEN_ALL === 'true'

const manualRelatedAssetIndex: Record<AssetId, AssetId[]> = {
  [ethAssetId]: [optimismAssetId, arbitrumAssetId, arbitrumNovaAssetId, baseAssetId],
  [foxAssetId]: [foxOnArbitrumOneAssetId],
}

// Category → Canonical Asset mapping for bridged tokens
// Maps CoinGecko bridged categories to their Ethereum canonical tokens
// Note: bridged-usdt includes USDT0 variants - they will be grouped together with ETH USDT as primary
const BRIDGED_CATEGORY_MAPPINGS: Record<string, AssetId> = {
  'bridged-usdc': 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // ETH USDC
  'bridged-usdt': 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7', // ETH USDT (includes USDT0)
  'bridged-weth': 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // ETH WETH
  'bridged-wbtc': 'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // ETH WBTC
  'bridged-dai': 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f', // ETH DAI
  'bridged-wsteth': 'eip155:1/erc20:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // ETH wstETH
}

export const getManualRelatedAssetIds = (
  assetId: AssetId,
): { relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined => {
  // assetId is the primary implementation for the related assets, which makes it pretty easy, just access the property and voila
  if (manualRelatedAssetIndex[assetId]) {
    const relatedAssetKey = assetId
    return {
      relatedAssetIds: manualRelatedAssetIndex[assetId],
      relatedAssetKey,
    }
  }

  // assetId isn't the primary implementation, but may be one of the related assets
  for (const [relatedAssetKey, relatedAssetIds] of Object.entries(manualRelatedAssetIndex)) {
    if (relatedAssetIds.includes(assetId)) {
      return {
        relatedAssetIds,
        relatedAssetKey,
      }
    }
  }

  // No related assets found
  return undefined
}

const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

// Pre-fetch bridged category mappings
// Returns mapping of category → array of coin IDs in that category
const fetchBridgedCategoryMappings = async (): Promise<Record<string, string[]>> => {
  const categoryToCoinIds: Record<string, string[]> = {}

  for (const category of Object.keys(BRIDGED_CATEGORY_MAPPINGS)) {
    const { data } = await axiosInstance.get<CoinGeckoMarketCap[]>(
      `${coingeckoBaseUrl}/coins/markets`,
      {
        params: {
          category,
          vs_currency: 'usd',
          per_page: 250,
          page: 1,
        },
      },
    )

    categoryToCoinIds[category] = data.map(coin => coin.id)
  }

  return categoryToCoinIds
}

const chunkArray = <T>(array: T[], chunkSize: number) => {
  const result = []
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize)
    result.push(chunk)
  }
  return result
}

const getZerionRelatedAssetIds = async (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
): Promise<{ relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined> => {
  const basicAuth = 'Basic ' + Buffer.from(ZERION_API_KEY + ':').toString('base64')

  const options = {
    method: 'GET' as const,
    baseURL: ZERION_BASE_URL,
    headers: {
      Authorization: basicAuth,
    },
  }

  const { assetReference } = fromAssetId(assetId)

  if (FEE_ASSET_IDS.includes(assetId)) return

  const filter = { params: { 'filter[implementation_address]': assetReference } }
  const url = '/fungibles'
  const payload = { ...options, ...filter, url }
  const { data: res, status, statusText } = await axiosInstance.request(payload)

  // exit if any request fails
  if (status !== 200) throw Error(`Zerion request failed: ${statusText}`)

  try {
    zerionFungiblesSchema.parse(res)
  } catch (e) {
    console.log(JSON.stringify(res, null, 2))
  }

  const validationResult = zerionFungiblesSchema.parse(res)
  const firstEntry = validationResult.data[0]

  if (firstEntry === undefined) return

  const implementations = firstEntry.attributes.implementations

  // Use all assetIds actually present in the dataset
  const allRelatedAssetIds = implementations
    ?.map(zerionImplementationToMaybeAssetId)
    .filter(isSome)
    .filter(relatedAssetId => {
      return assetData[relatedAssetId] !== undefined
    })

  if (!allRelatedAssetIds || allRelatedAssetIds.length <= 1) {
    return
  }

  const relatedAssetKey = allRelatedAssetIds[0]
  const relatedAssetIds = allRelatedAssetIds.filter(assetId => assetId !== relatedAssetKey)

  return { relatedAssetIds, relatedAssetKey }
}

const getCoingeckoRelatedAssetIds = async (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
  categoryToCoinIds: Record<string, string[]>,
): Promise<{ relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined> => {
  if (!isToken(assetId)) return
  // Yes, this means effectively the same but double wrap never hurts
  if (FEE_ASSET_IDS.includes(assetId)) return
  const { chainId, assetReference: contractAddress } = fromAssetId(assetId)
  const coingeckoChain = adapters.chainIdToCoingeckoAssetPlatform(chainId)
  const coinUri = `${coingeckoChain}/contract/${contractAddress}?vs_currency=usd`
  const { data } = await axios.get<CoingeckoAssetDetails>(`${coingeckoBaseUrl}/coins/${coinUri}`)

  const platforms = data.platforms
  const coinId = data.id

  // Use all assetIds actually present in the dataset
  let allRelatedAssetIds = Object.entries(platforms)
    ?.map(coingeckoPlatformDetailsToMaybeAssetId)
    .filter(isSome)
    .filter(relatedAssetId => assetData[relatedAssetId] !== undefined)

  // Determine canonical asset in THREE ways:
  let bridgedCanonical: AssetId | undefined

  // 1. Check if THIS asset is an Ethereum canonical (e.g., processing ETH USDT itself)
  const ethereumCanonicals = Object.values(BRIDGED_CATEGORY_MAPPINGS)
  if (ethereumCanonicals.includes(assetId)) {
    bridgedCanonical = assetId
  }

  // 2. Check if this coin is in a bridged category (catches bridged variants with unique coin IDs)
  if (!bridgedCanonical) {
    for (const [category, coinIds] of Object.entries(categoryToCoinIds)) {
      if (coinIds.includes(coinId)) {
        bridgedCanonical = BRIDGED_CATEGORY_MAPPINGS[category]
        break
      }
    }
  }

  // 3. Check if platforms list contains an Ethereum canonical (catches shared coin IDs like USDC/USDT)
  // CoinGecko uses the same coin ID for native USDC/USDT across multiple chains
  if (!bridgedCanonical) {
    for (const canonical of ethereumCanonicals) {
      if (allRelatedAssetIds.includes(canonical)) {
        bridgedCanonical = canonical
        break
      }
    }
  }

  // Add canonical FIRST to ensure it becomes the primary (relatedAssetKey)
  // This fixes the first-come-first-served issue where non-canonical assets became primaries
  if (bridgedCanonical && assetData[bridgedCanonical]) {
    allRelatedAssetIds.unshift(bridgedCanonical)
    // Remove duplicates while preserving order
    allRelatedAssetIds = Array.from(new Set(allRelatedAssetIds))
  }

  if (allRelatedAssetIds.length <= 1) {
    // Still return canonical even if no other assets yet (fixes Zerion override for WBTC/WETH/WSTETH)
    if (bridgedCanonical) {
      return { relatedAssetIds: [], relatedAssetKey: bridgedCanonical }
    }
    return
  }

  const relatedAssetKey = allRelatedAssetIds[0]
  const relatedAssetIds = allRelatedAssetIds.filter(assetId => assetId !== relatedAssetKey)

  return { relatedAssetIds, relatedAssetKey }
}

// Initialize counters for happy and sad fetches
let happyCount = 0
let sadCount = 0

const processRelatedAssetIds = async (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
  relatedAssetIndex: Record<AssetId, AssetId[]>,
  categoryToCoinIds: Record<string, string[]>,
  throttle: () => Promise<void>,
): Promise<void> => {
  const existingRelatedAssetKey = assetData[assetId].relatedAssetKey

  if (!REGEN_ALL && existingRelatedAssetKey) {
    return
  }

  console.log(`Processing related assetIds for ${assetId}`)

  // Check if this asset is already in the relatedAssetIndex
  if (!REGEN_ALL) {
    for (const [key, relatedAssets] of Object.entries(relatedAssetIndex)) {
      if (relatedAssets.includes(assetId)) {
        if (existingRelatedAssetKey !== key) {
          console.log(
            `Updating relatedAssetKey for ${assetId} from ${existingRelatedAssetKey} to ${key}`,
          )
          assetData[assetId].relatedAssetKey = key
        }
        return // Early return - asset already processed and grouped
      }
    }
  }

  const coingeckoRelatedAssetsResult = await getCoingeckoRelatedAssetIds(
    assetId,
    assetData,
    categoryToCoinIds,
  )
    .then(result => {
      happyCount++
      return result
    })
    .catch(() => {
      sadCount++
      return undefined
    })

  const zerionRelatedAssetsResult = await getZerionRelatedAssetIds(
    // DO NOT REMOVE ME - reuse the relatedAssetKey if found with coingecko fetch. cg may not have
    // all related assetIds for a given asset, and Zerion may not have any at all the same asset.
    // e.g USDC.SOL is found on Coingecko but with only USDC.ETH as a relatedAssetId, and is not
    // present at all under the USDC.SOL umbrella in Zerion. Using the primary implementation
    // ensures we use a reliable identifier for the related assets, not a more obscure one.
    coingeckoRelatedAssetsResult?.relatedAssetKey ?? assetId,
    assetData,
  )
    .then(result => {
      happyCount++
      return result
    })
    .catch(() => {
      sadCount++
      return undefined
    })

  const manualRelatedAssetsResult = getManualRelatedAssetIds(assetId)

  // ensure empty results get added so we can use this index to generate distinct asset list
  const { relatedAssetIds: manualRelatedAssetIds } = manualRelatedAssetsResult ?? {
    relatedAssetIds: [],
  }

  // Prioritize CoinGecko if it detected an Ethereum canonical (via our three-way check)
  // This prevents Zerion from overriding our canonical detection
  const ethereumCanonicals = Object.values(BRIDGED_CATEGORY_MAPPINGS)
  const coingeckoDetectedCanonical =
    coingeckoRelatedAssetsResult?.relatedAssetKey &&
    ethereumCanonicals.includes(coingeckoRelatedAssetsResult.relatedAssetKey)

  let relatedAssetKey =
    manualRelatedAssetsResult?.relatedAssetKey ||
    (coingeckoDetectedCanonical
      ? coingeckoRelatedAssetsResult?.relatedAssetKey
      : zerionRelatedAssetsResult?.relatedAssetKey ||
        coingeckoRelatedAssetsResult?.relatedAssetKey) ||
    assetId

  // If the relatedAssetKey itself points to another key, follow the chain to find the actual key
  // This handles the case where Tron WETH -> ETH WETH, but ETH WETH -> Arbitrum WETH
  const relatedAssetKeyData = assetData[relatedAssetKey]?.relatedAssetKey
  if (relatedAssetKeyData) {
    relatedAssetKey = relatedAssetKeyData
  }

  const zerionRelatedAssetIds = zerionRelatedAssetsResult?.relatedAssetIds ?? []
  const coingeckoRelatedAssetIds = coingeckoRelatedAssetsResult?.relatedAssetIds ?? []

  const mergedRelatedAssetIds = Array.from(
    new Set([
      ...manualRelatedAssetIds,
      ...zerionRelatedAssetIds,
      ...coingeckoRelatedAssetIds,
      assetId,
    ]),
  )

  // First-come-first-served conflict detection
  // Filters out assets already claimed by a different group to prevent cross-contamination
  const cleanedRelatedAssetIds = mergedRelatedAssetIds.filter(candidateAssetId => {
    const existingKey = assetData[candidateAssetId]?.relatedAssetKey

    // Asset has no group yet, or is already in the current group - OK to include
    if (!existingKey || existingKey === relatedAssetKey) {
      return true
    }

    // Asset already belongs to a different group - reject to prevent stealing
    console.warn(
      `[Related Asset Conflict] Asset ${candidateAssetId} already belongs to group ${existingKey}, ` +
        `refusing to add to ${relatedAssetKey}. ` +
        `This asset was claimed by a higher market cap token that processed first. ` +
        `Upstream data provider (CoinGecko/Zerion) may have data quality issues.`,
    )
    return false
  })

  // Has zerion-provided related assets, or manually added ones
  const hasRelatedAssets = cleanedRelatedAssetIds.length > 1

  if (hasRelatedAssets) {
    // Check if this exact group already exists in the index (can happen with parallel processing)
    const existingGroup = relatedAssetIndex[relatedAssetKey]
    const isAlreadyGrouped = existingGroup && existingGroup.includes(assetId)

    if (!isAlreadyGrouped) {
      // Merge with existing group instead of replacing it
      const currentGroup = relatedAssetIndex[relatedAssetKey] || []
      relatedAssetIndex[relatedAssetKey] = Array.from(
        new Set([...currentGroup, ...cleanedRelatedAssetIds]),
      )
    }

    // Always ensure all assets in the group have the correct relatedAssetKey
    // This handles both new groups and updates from parallel processing
    const allAssetsInGroup = relatedAssetIndex[relatedAssetKey]
    for (const relatedAssetId of allAssetsInGroup) {
      if (assetData[relatedAssetId]) {
        assetData[relatedAssetId].relatedAssetKey = relatedAssetKey
      }
    }
  } else {
    // If there are no related assets, set relatedAssetKey to null
    assetData[assetId].relatedAssetKey = null
  }

  await throttle()
}

// Change me to true to do a full rebuild of related asset indexes - defaults to false so we don't have endless generation scripts.
export const generateRelatedAssetIndex = async () => {
  console.log('generateRelatedAssetIndex() starting')

  const assetDataJson = JSON.parse(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
  const relatedAssetIndexJson = JSON.parse(
    await fs.promises.readFile(RELATED_ASSET_INDEX_PATH, 'utf8'),
  )

  const generatedAssetData: Record<AssetId, Asset> = assetDataJson.byId || {}
  const sortedAssetIds: AssetId[] = assetDataJson.ids || []
  const relatedAssetIndex: Record<AssetId, AssetId[]> = REGEN_ALL ? {} : relatedAssetIndexJson

  // Remove stale related asset data from the assetData where the primary related asset no longer exists
  Object.values(generatedAssetData).forEach(asset => {
    const relatedAssetKey = asset.relatedAssetKey

    if (!relatedAssetKey) return

    const primaryRelatedAsset = generatedAssetData[relatedAssetKey]

    // remove relatedAssetKey from the existing data to ensure the related assets get updated
    if (primaryRelatedAsset === undefined) {
      delete relatedAssetIndex[relatedAssetKey]
      delete asset.relatedAssetKey
    }
  })

  // Remove stale related asset data from the relatedAssetIndex where:
  // a) a related assetId no longer exists in the dataset
  Object.entries(relatedAssetIndex).forEach(([relatedAssetKey, relatedAssetIds]) => {
    relatedAssetIndex[relatedAssetKey] = relatedAssetIds.filter(
      assetId => generatedAssetData[assetId] !== undefined,
    )
  })

  const categoryToCoinIds = await fetchBridgedCategoryMappings()

  const { throttle, clear: clearThrottleInterval } = createThrottle({
    capacity: 50, // Reduced initial capacity to allow for a burst but not too high
    costPerReq: 1, // Keeping the cost per request as 1 for simplicity
    drainPerInterval: 25, // Adjusted drain rate to replenish at a sustainable pace
    intervalMs: 2000,
  })

  const chunks = chunkArray(Object.keys(generatedAssetData), BATCH_SIZE)
  for (const [i, batch] of chunks.entries()) {
    console.log(`Processing chunk: ${i} of ${chunks.length}`)
    await Promise.all(
      batch.map(async assetId => {
        await processRelatedAssetIds(
          assetId,
          generatedAssetData,
          relatedAssetIndex,
          categoryToCoinIds,
          throttle,
        )
        return
      }),
    )
  }

  clearThrottleInterval()

  await fs.promises.writeFile(
    ASSET_DATA_PATH,
    JSON.stringify({ byId: generatedAssetData, ids: sortedAssetIds }, null, 2),
  )
  await fs.promises.writeFile(RELATED_ASSET_INDEX_PATH, JSON.stringify(relatedAssetIndex, null, 2))

  console.info(`generateRelatedAssetIndex() done. Successes: ${happyCount}, Failures: ${sadCount}`)
  return
}
