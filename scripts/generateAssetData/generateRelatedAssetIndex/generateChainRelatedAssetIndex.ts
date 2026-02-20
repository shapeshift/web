import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumAssetId,
  baseAssetId,
  ethAssetId,
  FEE_ASSET_IDS,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAssetId,
  inkAssetId,
  katanaAssetId,
  lineaAssetId,
  megaethAssetId,
  optimismAssetId,
  scrollAssetId,
  starknetAssetId,
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

const ZERION_BASE_URL = 'https://api.zerion.io/v1'
const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'

const axiosInstance = axios.create()
axiosRetry(axiosInstance, { retries: 5, retryDelay: axiosRetry.exponentialDelay })

const BRIDGED_CATEGORY_MAPPINGS: Record<string, AssetId> = {
  'bridged-usdc': 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  'bridged-usdt': 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  'bridged-weth': 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  'bridged-wbtc': 'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  'bridged-dai': 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
  'bridged-wsteth': 'eip155:1/erc20:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
}

const manualRelatedAssetIndex: Record<AssetId, AssetId[]> = {
  [ethAssetId]: [
    optimismAssetId,
    arbitrumAssetId,
    baseAssetId,
    inkAssetId,
    katanaAssetId,
    lineaAssetId,
    megaethAssetId,
    scrollAssetId,
  ],
  [foxAssetId]: [foxOnArbitrumOneAssetId],
  [starknetAssetId]: [
    'eip155:1/erc20:0xca14007eff0db1f8135f4c25b34de49ab0d42766',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:HsRpHQn6VbyMs5b5j5SV6xQ2VvpvvCCzu19GjytVSCoz',
  ],
  // Native stablecoins on Linea + Mantle - CoinGecko doesn't tag these as bridged categories
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': [
    'eip155:59144/erc20:0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    'eip155:5000/erc20:0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9',
  ],
  'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7': [
    'eip155:59144/erc20:0xa219439258ca9da29e9cc4ce5596924745e12b93',
    'eip155:5000/erc20:0x201eba5cc46d216ce6dc03f6a759e8e766e956ae',
  ],
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f': [
    'eip155:59144/erc20:0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5',
  ],
  // CRO on Ethereum <-> CRO native on Cronos
  'eip155:1/erc20:0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b': [
    'eip155:25/slip44:60',
  ],
}

const getManualRelatedAssetIds = (
  assetId: AssetId,
): { relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined => {
  if (manualRelatedAssetIndex[assetId]) {
    return {
      relatedAssetIds: manualRelatedAssetIndex[assetId],
      relatedAssetKey: assetId,
    }
  }

  for (const [relatedAssetKey, relatedAssetIds] of Object.entries(manualRelatedAssetIndex)) {
    if (relatedAssetIds.includes(assetId)) {
      return {
        relatedAssetIds,
        relatedAssetKey,
      }
    }
  }

  return undefined
}

const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

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

const getZerionRelatedAssetIds = async (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
  zerionApiKey: string,
): Promise<{ relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined> => {
  const basicAuth = 'Basic ' + Buffer.from(zerionApiKey + ':').toString('base64')

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

  const allRelatedAssetIds = implementations
    ?.map(zerionImplementationToMaybeAssetId)
    .filter(isSome)
    .filter(relatedAssetId => assetData[relatedAssetId] !== undefined)

  if (!allRelatedAssetIds || allRelatedAssetIds.length <= 1) {
    return
  }

  const relatedAssetKey = allRelatedAssetIds[0]
  const relatedAssetIds = allRelatedAssetIds.filter(id => id !== relatedAssetKey)

  return { relatedAssetIds, relatedAssetKey }
}

const getCoingeckoRelatedAssetIds = async (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
  categoryToCoinIds: Record<string, string[]>,
): Promise<{ relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined> => {
  if (!isToken(assetId)) return
  if (FEE_ASSET_IDS.includes(assetId)) return
  const { chainId, assetReference: contractAddress } = fromAssetId(assetId)
  const coingeckoChain = adapters.chainIdToCoingeckoAssetPlatform(chainId)
  const coinUri = `${coingeckoChain}/contract/${contractAddress}?vs_currency=usd`
  const { data } = await axios.get<CoingeckoAssetDetails>(`${coingeckoBaseUrl}/coins/${coinUri}`)

  const platforms = data.platforms
  const coinId = data.id

  let allRelatedAssetIds = Object.entries(platforms)
    ?.map(coingeckoPlatformDetailsToMaybeAssetId)
    .filter(isSome)
    .filter(relatedAssetId => assetData[relatedAssetId] !== undefined)

  let bridgedCanonical: AssetId | undefined

  const ethereumCanonicals = Object.values(BRIDGED_CATEGORY_MAPPINGS)
  if (ethereumCanonicals.includes(assetId)) {
    bridgedCanonical = assetId
  }

  if (!bridgedCanonical) {
    for (const [category, coinIds] of Object.entries(categoryToCoinIds)) {
      if (coinIds.includes(coinId)) {
        bridgedCanonical = BRIDGED_CATEGORY_MAPPINGS[category]
        break
      }
    }
  }

  if (!bridgedCanonical) {
    for (const canonical of ethereumCanonicals) {
      if (allRelatedAssetIds.includes(canonical)) {
        bridgedCanonical = canonical
        break
      }
    }
  }

  if (bridgedCanonical && assetData[bridgedCanonical]) {
    allRelatedAssetIds.unshift(bridgedCanonical)
    allRelatedAssetIds = Array.from(new Set(allRelatedAssetIds))
  }

  if (allRelatedAssetIds.length <= 1) {
    if (bridgedCanonical) {
      return { relatedAssetIds: [], relatedAssetKey: bridgedCanonical }
    }
    return
  }

  const relatedAssetKey = allRelatedAssetIds[0]
  const relatedAssetIds = allRelatedAssetIds.filter(id => id !== relatedAssetKey)

  return { relatedAssetIds, relatedAssetKey }
}

let happyCount = 0
let sadCount = 0

const processRelatedAssetIds = async (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
  relatedAssetIndex: Record<AssetId, AssetId[]>,
  categoryToCoinIds: Record<string, string[]>,
  zerionApiKey: string,
  throttle: () => Promise<void>,
): Promise<void> => {
  const existingRelatedAssetKey = assetData[assetId].relatedAssetKey

  if (existingRelatedAssetKey) {
    const group = relatedAssetIndex[existingRelatedAssetKey]
    if (group && group.includes(assetId)) {
      return
    }

    if (group && !group.includes(assetId)) {
      console.log(
        `Adding ${assetId} to existing group ${existingRelatedAssetKey} (had key but wasn't in array)`,
      )
      relatedAssetIndex[existingRelatedAssetKey] = Array.from(new Set([...group, assetId]))
      return
    }

    // Group absent from index but asset has a relatedAssetKey - recover by creating the group
    if (!group) {
      console.log(
        `Recovering orphaned relatedAssetKey for ${assetId}: creating group ${existingRelatedAssetKey}`,
      )
      relatedAssetIndex[existingRelatedAssetKey] = [assetId]
      return
    }

    return
  }

  console.log(`Processing related assetIds for ${assetId}`)

  for (const [key, relatedAssets] of Object.entries(relatedAssetIndex)) {
    if (relatedAssets.includes(assetId)) {
      if (existingRelatedAssetKey !== key) {
        console.log(
          `Updating relatedAssetKey for ${assetId} from ${existingRelatedAssetKey} to ${key}`,
        )
        assetData[assetId].relatedAssetKey = key
      }
      return
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
    coingeckoRelatedAssetsResult?.relatedAssetKey ?? assetId,
    assetData,
    zerionApiKey,
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

  const { relatedAssetIds: manualRelatedAssetIds } = manualRelatedAssetsResult ?? {
    relatedAssetIds: [],
  }

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

  const cleanedRelatedAssetIds = mergedRelatedAssetIds.filter(candidateAssetId => {
    const existingKey = assetData[candidateAssetId]?.relatedAssetKey

    if (!existingKey || existingKey === relatedAssetKey) {
      return true
    }

    console.warn(
      `[Related Asset Conflict] Asset ${candidateAssetId} already belongs to group ${existingKey}, ` +
        `refusing to add to ${relatedAssetKey}.`,
    )
    return false
  })

  const hasRelatedAssets = cleanedRelatedAssetIds.length > 1
  const existingGroupForKey = relatedAssetIndex[relatedAssetKey]

  if (hasRelatedAssets || existingGroupForKey) {
    const isAlreadyGrouped = existingGroupForKey && existingGroupForKey.includes(assetId)

    if (!isAlreadyGrouped) {
      const currentGroup = existingGroupForKey || []
      relatedAssetIndex[relatedAssetKey] = Array.from(
        new Set([...currentGroup, ...cleanedRelatedAssetIds]),
      )
    }

    const allAssetsInGroup = relatedAssetIndex[relatedAssetKey]
    for (const relatedAssetId of allAssetsInGroup) {
      if (assetData[relatedAssetId]) {
        assetData[relatedAssetId].relatedAssetKey = relatedAssetKey
      }
    }
  } else {
    assetData[assetId].relatedAssetKey = null
  }

  await throttle()
}

/**
 * Chain-scoped variant of generateRelatedAssetIndex.
 * Only processes assets matching the given chainId instead of all 30K+ assets.
 * Reads full asset data + related asset index (needed for cross-chain lookups),
 * but only makes API calls for the target chain's assets.
 */
export const generateChainRelatedAssetIndex = async (chainId: ChainId) => {
  const zerionApiKey = process.env.ZERION_API_KEY
  if (!zerionApiKey) throw new Error('Missing ZERION_API_KEY - source ~/.zshrc or set it')

  console.log(`[generate:chain] generating related asset index for chainId=${chainId}...`)

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
  const relatedAssetIndex: Record<AssetId, AssetId[]> = relatedAssetIndexJson

  // Only get asset IDs for the target chain
  const chainAssetIds = Object.keys(generatedAssetData).filter(
    assetId => generatedAssetData[assetId].chainId === chainId,
  )

  console.log(`[generate:chain] ${chainAssetIds.length} assets to process for related index`)

  const categoryToCoinIds = await fetchBridgedCategoryMappings()

  const { throttle, clear: clearThrottleInterval } = createThrottle({
    capacity: 50,
    costPerReq: 1,
    drainPerInterval: 25,
    intervalMs: 2000,
  })

  // Process only chain assets in batches of 100
  const BATCH_SIZE = 100
  for (let i = 0; i < chainAssetIds.length; i += BATCH_SIZE) {
    const batch = chainAssetIds.slice(i, i + BATCH_SIZE)
    console.log(
      `[generate:chain] related index chunk ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(
        chainAssetIds.length / BATCH_SIZE,
      )}`,
    )
    await Promise.all(
      batch.map(assetId =>
        processRelatedAssetIds(
          assetId,
          generatedAssetData,
          relatedAssetIndex,
          categoryToCoinIds,
          zerionApiKey,
          throttle,
        ),
      ),
    )
  }

  clearThrottleInterval()

  await fs.promises.writeFile(
    ASSET_DATA_PATH,
    JSON.stringify({ byId: generatedAssetData, ids: sortedAssetIds }, null, 2),
  )
  await fs.promises.writeFile(RELATED_ASSET_INDEX_PATH, JSON.stringify(relatedAssetIndex, null, 2))

  console.info(
    `[generate:chain] related asset index done. Successes: ${happyCount}, Failures: ${sadCount}`,
  )
}
