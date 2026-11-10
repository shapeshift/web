import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumAssetId,
  baseAssetId,
  bobAssetId,
  bscAssetId,
  cronosAssetId,
  elysiumAssetId,
  ethAssetId,
  FEE_ASSET_IDS,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAssetId,
  hyperEvmAssetId,
  inkAssetId,
  katanaAssetId,
  megaethAssetId,
  optimismAssetId,
  robinhoodAssetId,
  solAssetId,
  sonicAssetId,
  starknetAssetId,
  unichainAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { ZERION_CHAINS_MAP } from '@shapeshiftoss/types'
import { createThrottle, isToken } from '@shapeshiftoss/utils'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import uniq from 'lodash/uniq'

import { ASSET_DATA_PATH, RELATED_ASSET_INDEX_PATH } from '../constants'
import {
  coingeckoPlatformDetailsToMaybeAssetId,
  zerionImplementationToMaybeAssetId,
} from './mapping'
import { reconcileRelatedAssetGroups } from './reconcileRelatedAssetGroups'
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

const zerionChainIds = new Set<ChainId>(Object.values(ZERION_CHAINS_MAP))

const manualRelatedAssetIndex: Record<AssetId, AssetId[]> = {
  [ethAssetId]: [
    optimismAssetId,
    arbitrumAssetId,
    baseAssetId,
    katanaAssetId,
    megaethAssetId,
    inkAssetId,
    unichainAssetId,
    bobAssetId,
    robinhoodAssetId,
  ],
  [foxAssetId]: [foxOnArbitrumOneAssetId],
  [starknetAssetId]: [
    'eip155:1/erc20:0xca14007eff0db1f8135f4c25b34de49ab0d42766',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:HsRpHQn6VbyMs5b5j5SV6xQ2VvpvvCCzu19GjytVSCoz',
  ],
  [sonicAssetId]: ['eip155:1/erc20:0x4e15361fd6b4bb609fa63c81a2be19d873717870'],
  [cronosAssetId]: ['eip155:1/erc20:0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b'],
  [bscAssetId]: ['eip155:1/erc20:0xb8c77482e45f1f44de1745f52c74426c631bdd52'],
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': [
    'eip155:5000/erc20:0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9',
    'eip155:146/erc20:0x29219dd400f2bf60e5a23d13be72b486d4038894',
    'aptos:1/fungible:0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    'eip155:99901/erc20:0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65',
  ],
  'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7': [
    'eip155:5000/erc20:0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
    'eip155:146/erc20:0x6047828dc181963ba44974801ff68e538da5eaf9',
    'aptos:1/fungible:0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
  ],
  // CoinGecko lists wrapped and pegged SOL as separate coins from native SOL
  [solAssetId]: [
    'eip155:56/erc20:0x570a5d26f7765ecb712c0924e4de545b89fd43df',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:So11111111111111111111111111111111111111112',
    'eip155:8453/erc20:0x311935cd80b76769bf2ecc9d8ab7635b2139cf82',
  ],
  // Ethereum SHIB, not Binance-Peg SHIB, is the main asset
  'eip155:1/erc20:0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': [
    'eip155:56/erc20:0x2859e4544c4bb03966803b044a93563bd2d0dd4d',
  ],
  // Ethereum weETH leads its family, and CoinGecko files Katana weETH under bridged WETH
  'eip155:1/erc20:0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee': [
    'eip155:42161/erc20:0x35751007a407ca6feffe80b3cb397736d2cf4dbe',
    'eip155:747474/erc20:0x9893989433e7a383cb313953e4c2365107dc19a7',
  ],
  // Both pay gas in HYPE, so the tie between them is broken here instead of by list order
  [hyperEvmAssetId]: [elysiumAssetId],
  // Elysium bridged copies of HyperEVM tokens, which CoinGecko doesn't list on its Elysium platform
  'eip155:999/erc20:0x5555555555555555555555555555555555555555': [
    'eip155:99901/erc20:0xba876237b0f021a6c6d852d6c26e107997cc5e81',
  ],
  'eip155:999/erc20:0x000000000000780555bd0bca3791f89f9542c2d6': [
    'eip155:99901/erc20:0xe45a355d9e9cad2ad85f2d03e3ee3102a036acf0',
  ],
}

// Tokens a provider put in another token's group, each left to group with its own coin
const relatedAssetExclusions: AssetId[] = [
  // Fiamma BTC, which CoinGecko lists as bridged WBTC
  'eip155:1/erc20:0x22f0e0a4c97ff43546dad16d43ef854c773f0e08',
  'eip155:1329/erc20:0x60c230c38af6d86b0277a98a1caeaa345a7b061f',
  'eip155:8453/erc20:0x60c230c38af6d86b0277a98a1caeaa345a7b061f',
  'aptos:1/fungible:0x75de592a7e62e6224d13763c392190fda8635ebb79c798a5e9dd0840102f3f93',
  // Senate, grouped with Sidus at the same address on Base
  'eip155:1/erc20:0x34be5b8c30ee4fde069dc878989686abe9884470',
  // Spiko UK T-Bills, grouped with the Spiko Cash & Carry fund
  'eip155:1/erc20:0xf695df6c0f3bb45918a7a82e83348fc59517734e',
  'eip155:137/erc20:0x970e2adc2fdf53aea6b5fa73ca6dc30eafedfe3d',
  'eip155:42161/erc20:0x903d5990119bc799423e9c25c56518ba7dd19474',
  'eip155:8453/erc20:0xa8de1f55aa0e381cb456e1dcc9ff781ea0079068',
  'starknet:SN_MAIN/token:0x0153d6e0462080bb2842109e9b64f589ef5aa06bb32b26bbdb894aca92674395',
  // USDai, grouped with staked USDai
  'eip155:1/erc20:0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef',
  'eip155:8453/erc20:0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef',
  // Same-symbol tokens from unrelated projects
  'eip155:1/erc20:0x59f4f336bf3d0c49dbfba4a74ebd2a6ace40539a', // CAT
  'eip155:1/erc20:0x699ec925118567b6475fe495327ba0a778234aaa', // DUCKY
  'eip155:1/erc20:0x809826cceab68c387726af962713b64cb5cb3cca', // NCASH
  'eip155:1/erc20:0x4947b72fed037ade3365da050a9be5c063e605a7', // PEANUT
]

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

type CoingeckoCoin = { id: string; assetIds: AssetId[] }

const coingeckoPlatformDetailsToSupportedAssetId = (
  platformDetails: [string, string],
): AssetId | undefined => {
  try {
    return coingeckoPlatformDetailsToMaybeAssetId(platformDetails)
  } catch {
    // chains without an asset namespace and malformed addresses throw
    return
  }
}

const fetchCoingeckoCoinsByAssetId = async (): Promise<Record<AssetId, CoingeckoCoin>> => {
  const { data } = await axiosInstance.get<Pick<CoingeckoAssetDetails, 'id' | 'platforms'>[]>(
    `${coingeckoBaseUrl}/coins/list`,
    { params: { include_platform: true } },
  )

  const coinsByAssetId: Record<AssetId, CoingeckoCoin> = {}

  for (const { id, platforms } of data) {
    const assetIds = uniq([
      ...Object.entries(platforms).map(coingeckoPlatformDetailsToSupportedAssetId).filter(isSome),
      ...adapters.coingeckoToAptosAssetIds(id),
    ])

    const coin = { id, assetIds }
    for (const assetId of assetIds) coinsByAssetId[assetId] = coin
  }

  if (!Object.keys(coinsByAssetId).length) throw new Error('CoinGecko coin list has no platforms')

  return coinsByAssetId
}

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

  const { chainId, assetReference } = fromAssetId(assetId)

  if (FEE_ASSET_IDS.includes(assetId)) return
  if (!zerionChainIds.has(chainId)) return

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
  const implementationAssetIdsByEntry = validationResult.data.map(entry =>
    (entry.attributes.implementations ?? []).map(zerionImplementationToMaybeAssetId).filter(isSome),
  )
  // The address filter ignores the chain, so only trust a fungible that has this exact implementation
  const matchingAssetIds = implementationAssetIdsByEntry.find(implementationAssetIds =>
    implementationAssetIds.some(id => id.toLowerCase() === assetId.toLowerCase()),
  )

  if (matchingAssetIds === undefined) return

  // Use all assetIds actually present in the dataset
  const allRelatedAssetIds = matchingAssetIds.filter(
    relatedAssetId => assetData[relatedAssetId] !== undefined,
  )

  if (allRelatedAssetIds.length <= 1) {
    return
  }

  const relatedAssetKey = allRelatedAssetIds[0]
  const relatedAssetIds = allRelatedAssetIds.filter(assetId => assetId !== relatedAssetKey)

  return { relatedAssetIds, relatedAssetKey }
}

const getCoingeckoRelatedAssetIds = (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
  categoryToCoinIds: Record<string, string[]>,
  coinsByAssetId: Record<AssetId, CoingeckoCoin>,
): { relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined => {
  if (!isToken(assetId)) return
  // Yes, this means effectively the same but double wrap never hurts
  if (FEE_ASSET_IDS.includes(assetId)) return

  const coin = coinsByAssetId[assetId]
  if (!coin) return

  const coinId = coin.id

  // Use all assetIds actually present in the dataset
  let allRelatedAssetIds = coin.assetIds.filter(
    relatedAssetId => assetData[relatedAssetId] !== undefined,
  )

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

  // CoinGecko's platform order is arbitrary, so prefer joining an existing group over starting one
  const groupedRelatedAssetId = allRelatedAssetIds.find(id => assetData[id]?.relatedAssetKey)
  if (groupedRelatedAssetId) {
    allRelatedAssetIds = [
      groupedRelatedAssetId,
      ...allRelatedAssetIds.filter(id => id !== groupedRelatedAssetId),
    ]
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
  coinsByAssetId: Record<AssetId, CoingeckoCoin>,
  regenAll: boolean,
  throttle: () => Promise<void>,
): Promise<void> => {
  const existingRelatedAssetKey = assetData[assetId].relatedAssetKey

  // An asset can carry a key the index no longer lists - e.g. it left the dataset and came back
  if (!regenAll && existingRelatedAssetKey) {
    const group = relatedAssetIndex[existingRelatedAssetKey] ?? []

    const rejoinedGroup = Array.from(new Set([...group, existingRelatedAssetKey, assetId]))

    // A group of one is not a group
    if (rejoinedGroup.length > 1) {
      relatedAssetIndex[existingRelatedAssetKey] = rejoinedGroup

      // Only fill a missing key - repointing would steal the asset from another group
      for (const relatedAssetId of rejoinedGroup) {
        const relatedAsset = assetData[relatedAssetId]
        if (relatedAsset && !relatedAsset.relatedAssetKey) {
          relatedAsset.relatedAssetKey = existingRelatedAssetKey
        }
      }

      return
    }
  }

  // Check if this asset is already in the relatedAssetIndex
  if (!regenAll) {
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

  const coingeckoRelatedAssetsResult = getCoingeckoRelatedAssetIds(
    assetId,
    assetData,
    categoryToCoinIds,
    coinsByAssetId,
  )

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
    .catch(err => {
      sadCount++
      console.warn(`[Zerion] ${assetId}: ${err instanceof Error ? err.message : err}`)
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

  // Providers report related assets exclusive of the primary, so add it back
  const mergedRelatedAssetIds = Array.from(
    new Set([
      ...manualRelatedAssetIds,
      ...zerionRelatedAssetIds,
      ...coingeckoRelatedAssetIds,
      relatedAssetKey,
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
export const generateRelatedAssetIndex = async (chainId?: ChainId) => {
  console.log(`generateRelatedAssetIndex(${chainId ?? ''}) starting`)

  const assetDataJson = JSON.parse(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
  const relatedAssetIndexJson = JSON.parse(
    await fs.promises.readFile(RELATED_ASSET_INDEX_PATH, 'utf8'),
  )

  if (!assetDataJson.byId || !assetDataJson.ids) {
    throw new Error(
      `Invalid asset data structure: expected { byId, ids } but got ${JSON.stringify(
        Object.keys(assetDataJson),
      )}`,
    )
  }

  const generatedAssetData: Record<AssetId, Asset> = assetDataJson.byId
  const sortedAssetIds: AssetId[] = assetDataJson.ids
  const regenAll = REGEN_ALL && !chainId
  const relatedAssetIndex: Record<AssetId, AssetId[]> = regenAll ? {} : relatedAssetIndexJson

  const rankByAssetId = new Map(sortedAssetIds.map((assetId, rank) => [assetId, rank]))
  const survivorsByMissingKey = new Map<AssetId, Set<AssetId>>()
  const handedOffAssetIds = new Set<AssetId>()
  const addSurvivor = (missingKey: AssetId, assetId: AssetId) => {
    if (!generatedAssetData[assetId] || handedOffAssetIds.has(assetId)) return
    handedOffAssetIds.add(assetId)
    survivorsByMissingKey.set(
      missingKey,
      (survivorsByMissingKey.get(missingKey) ?? new Set<AssetId>()).add(assetId),
    )
  }
  for (const [relatedAssetKey, relatedAssetIds] of Object.entries(relatedAssetIndex)) {
    if (generatedAssetData[relatedAssetKey]) continue
    delete relatedAssetIndex[relatedAssetKey]
    for (const assetId of relatedAssetIds) {
      const currentKey = generatedAssetData[assetId]?.relatedAssetKey
      if (currentKey && generatedAssetData[currentKey]) continue
      addSurvivor(relatedAssetKey, assetId)
    }
  }
  for (const [assetId, asset] of Object.entries(generatedAssetData)) {
    if (asset.relatedAssetKey && !generatedAssetData[asset.relatedAssetKey]) {
      addSurvivor(asset.relatedAssetKey, assetId)
    }
  }
  for (const survivorSet of survivorsByMissingKey.values()) {
    const survivors = [...survivorSet].sort(
      (a, b) =>
        (rankByAssetId.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (rankByAssetId.get(b) ?? Number.MAX_SAFE_INTEGER),
    )
    const [newKey] = survivors
    if (survivors.length > 1) {
      relatedAssetIndex[newKey] = uniq([...(relatedAssetIndex[newKey] ?? []), ...survivors])
    }
    for (const assetId of survivors) {
      if (survivors.length > 1) generatedAssetData[assetId].relatedAssetKey = newKey
      else delete generatedAssetData[assetId].relatedAssetKey
    }
  }

  // Remove stale related asset data from the relatedAssetIndex where:
  // a) a related assetId no longer exists in the dataset
  Object.entries(relatedAssetIndex).forEach(([relatedAssetKey, relatedAssetIds]) => {
    relatedAssetIndex[relatedAssetKey] = relatedAssetIds.filter(
      assetId => generatedAssetData[assetId] !== undefined,
    )
  })

  // b) the group has fewer than two members left
  Object.entries(relatedAssetIndex).forEach(([relatedAssetKey, relatedAssetIds]) => {
    if (relatedAssetIds.length > 1) return

    delete relatedAssetIndex[relatedAssetKey]

    // Only clear a key pointing at the group we just deleted - the asset may have rejoined another
    for (const assetId of [relatedAssetKey, ...relatedAssetIds]) {
      const asset = generatedAssetData[assetId]
      if (asset?.relatedAssetKey === relatedAssetKey) delete asset.relatedAssetKey
    }
  })

  const categoryToCoinIds = await fetchBridgedCategoryMappings()
  const coinsByAssetId = await fetchCoingeckoCoinsByAssetId()

  const { throttle, clear: clearThrottleInterval } = createThrottle({
    capacity: 50, // Reduced initial capacity to allow for a burst but not too high
    costPerReq: 1, // Keeping the cost per request as 1 for simplicity
    drainPerInterval: 25, // Adjusted drain rate to replenish at a sustainable pace
    intervalMs: 2000,
  })

  const assetIdsToProcess = Object.keys(generatedAssetData).filter(
    assetId => !chainId || generatedAssetData[assetId].chainId === chainId,
  )
  const chunks = chunkArray(assetIdsToProcess, BATCH_SIZE)
  for (const [i, batch] of chunks.entries()) {
    console.log(`Processing chunk: ${i} of ${chunks.length}`)
    await Promise.all(
      batch.map(async assetId => {
        await processRelatedAssetIds(
          assetId,
          generatedAssetData,
          relatedAssetIndex,
          categoryToCoinIds,
          coinsByAssetId,
          regenAll,
          throttle,
        )
        return
      }),
    )
  }

  clearThrottleInterval()

  const coinIdByAssetId: Record<AssetId, string> = {}
  for (const [assetId, coin] of Object.entries(coinsByAssetId)) coinIdByAssetId[assetId] = coin.id
  for (const nativeAssetId of FEE_ASSET_IDS) {
    const coinId = adapters.assetIdToCoingecko(nativeAssetId)
    if (coinId) coinIdByAssetId[nativeAssetId] = coinId
  }

  const reconciled = reconcileRelatedAssetGroups({
    relatedAssetKeyByAssetId: Object.fromEntries(
      Object.entries(generatedAssetData).map(([assetId, asset]) => [
        assetId,
        asset.relatedAssetKey,
      ]),
    ),
    relatedAssetIndex,
    rankedAssetIds: sortedAssetIds,
    coinIdByAssetId,
    manualRelatedAssetIndex,
    excludedAssetIds: relatedAssetExclusions,
    nativeAssetIds: FEE_ASSET_IDS,
    canonicalAssetIds: Object.values(BRIDGED_CATEGORY_MAPPINGS),
  })

  for (const [assetId, relatedAssetKey] of Object.entries(reconciled.relatedAssetKeyByAssetId)) {
    generatedAssetData[assetId].relatedAssetKey = relatedAssetKey
  }

  await fs.promises.writeFile(
    ASSET_DATA_PATH,
    JSON.stringify({ byId: generatedAssetData, ids: sortedAssetIds }),
  )
  await fs.promises.writeFile(
    RELATED_ASSET_INDEX_PATH,
    JSON.stringify(reconciled.relatedAssetIndex),
  )

  console.info(`generateRelatedAssetIndex() done. Successes: ${happyCount}, Failures: ${sadCount}`)
  return
}
