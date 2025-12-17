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
import {
  createThrottle,
  decodeAssetData,
  decodeRelatedAssetIndex,
  encodeAssetData,
  encodeRelatedAssetIndex,
  isToken,
} from '@shapeshiftoss/utils'
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
import type { PartialFields } from '@/lib/types'

// NOTE: this must call the zerion api directly rather than our proxy because of rate limiting requirements
const ZERION_BASE_URL = 'https://api.zerion.io/v1'
const BATCH_SIZE = 100

const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'

const axiosInstance = axios.create()
axiosRetry(axiosInstance, { retries: 5, retryDelay: axiosRetry.exponentialDelay })

const ZERION_API_KEY = process.env.ZERION_API_KEY
if (!ZERION_API_KEY) throw new Error('Missing Zerion API key - see readme for instructions')

const manualRelatedAssetIndex: Record<AssetId, AssetId[]> = {
  [ethAssetId]: [optimismAssetId, arbitrumAssetId, arbitrumNovaAssetId, baseAssetId],
  [foxAssetId]: [foxOnArbitrumOneAssetId],
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

const chunkArray = <T>(array: T[], chunkSize: number) => {
  const result = []
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize)
    result.push(chunk)
  }
  return result
}

const PLASMA_USDT0_ASSET_ID = 'eip155:9745/erc20:0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb'

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

  console.log({
    firstEntry,
  })

  if (firstEntry === undefined) return

  const implementations = firstEntry.attributes.implementations

  // Use all assetIds actually present in the dataset, excluding Plasma USDT0 (corrupt CoinGecko data)
  const allRelatedAssetIds = implementations
    ?.map(zerionImplementationToMaybeAssetId)
    .filter(isSome)
    .filter(relatedAssetId => {
      return assetData[relatedAssetId] !== undefined
    })
    .filter(relatedAssetId => relatedAssetId !== PLASMA_USDT0_ASSET_ID)

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
): Promise<{ relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined> => {
  if (!isToken(assetId)) return
  // Yes, this means effectively the same but double wrap never hurts
  if (FEE_ASSET_IDS.includes(assetId)) return
  const { chainId, assetReference: contractAddress } = fromAssetId(assetId)
  const coingeckoChain = adapters.chainIdToCoingeckoAssetPlatform(chainId)
  const coinUri = `${coingeckoChain}/contract/${contractAddress}?vs_currency=usd`
  const { data } = await axios.get<CoingeckoAssetDetails>(`${coingeckoBaseUrl}/coins/${coinUri}`)

  const platforms = data.platforms

  // Use all assetIds actually present in the dataset, excluding Plasma USDT0 (corrupt CoinGecko data)
  const allRelatedAssetIds = Object.entries(platforms)
    ?.map(coingeckoPlatformDetailsToMaybeAssetId)
    .filter(isSome)
    .filter(relatedAssetId => assetData[relatedAssetId] !== undefined)
    .filter(relatedAssetId => relatedAssetId !== PLASMA_USDT0_ASSET_ID)

  if (allRelatedAssetIds.length <= 1) {
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
  throttle: () => Promise<void>,
): Promise<void> => {
  // Skip related asset generation for Plasma usdt0 - Coingecko has corrupt data claiming
  // it shares the same Arbitrum/Polygon contracts as real USDT, which corrupts groupings
  if (assetId === PLASMA_USDT0_ASSET_ID) {
    assetData[assetId].relatedAssetKey = null
    await throttle()
    return
  }

  const existingRelatedAssetKey = assetData[assetId].relatedAssetKey

  if (existingRelatedAssetKey) {
    return
  }

  console.log(`Processing related assetIds for ${assetId}`)

  // Check if this asset is already in the relatedAssetIndex
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

  const coingeckoRelatedAssetsResult = await getCoingeckoRelatedAssetIds(assetId, assetData)
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

  let relatedAssetKey =
    manualRelatedAssetsResult?.relatedAssetKey ||
    zerionRelatedAssetsResult?.relatedAssetKey ||
    coingeckoRelatedAssetsResult?.relatedAssetKey ||
    assetId

  // If the relatedAssetKey itself points to another key, follow the chain to find the actual key
  // This handles the case where Tron WETH -> ETH WETH, but ETH WETH -> Arbitrum WETH
  const relatedAssetKeyData = assetData[relatedAssetKey]?.relatedAssetKey
  if (relatedAssetKeyData) {
    relatedAssetKey = relatedAssetKeyData
  }

  // If the relatedAssetKey is Plasma USDT0, reject this entire grouping
  if (relatedAssetKey === PLASMA_USDT0_ASSET_ID) {
    assetData[assetId].relatedAssetKey = null
    await throttle()
    return
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
  ).filter(id => id !== PLASMA_USDT0_ASSET_ID) // Filter out Plasma USDT0 from final merged array

  // Has zerion-provided related assets, or manually added ones
  const hasRelatedAssets = mergedRelatedAssetIds.length > 1

  if (hasRelatedAssets) {
    // Check if this exact group already exists in the index (can happen with parallel processing)
    const existingGroup = relatedAssetIndex[relatedAssetKey]
    const isAlreadyGrouped = existingGroup && existingGroup.includes(assetId)

    if (!isAlreadyGrouped) {
      // Merge with existing group instead of replacing it
      const currentGroup = relatedAssetIndex[relatedAssetKey] || []
      relatedAssetIndex[relatedAssetKey] = Array.from(
        new Set([...currentGroup, ...mergedRelatedAssetIds]),
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

  const encodedAssetData = JSON.parse(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
  const encodedRelatedAssetIndex = JSON.parse(
    await fs.promises.readFile(RELATED_ASSET_INDEX_PATH, 'utf8'),
  )

  const { assetData: generatedAssetData, sortedAssetIds } = decodeAssetData(encodedAssetData)
  const relatedAssetIndex = decodeRelatedAssetIndex(encodedRelatedAssetIndex, sortedAssetIds)

  // Remove stale related asset data from the assetData where:
  // a) the primary related asset no longer exists in the dataset
  // b) the related asset key is Plasma usdt0 (corrupt Coingecko data)
  Object.values(generatedAssetData).forEach(asset => {
    const relatedAssetKey = asset.relatedAssetKey

    if (!relatedAssetKey) return

    const primaryRelatedAsset = generatedAssetData[relatedAssetKey]

    // Clear Plasma usdt0 related asset key - Coingecko has corrupt data for this token
    const isPlasmaUsdt0 =
      relatedAssetKey === 'eip155:9745/erc20:0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb'

    // remove relatedAssetKey from the existing data to ensure the related assets get updated
    if (primaryRelatedAsset === undefined || isPlasmaUsdt0) {
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
        await processRelatedAssetIds(assetId, generatedAssetData, relatedAssetIndex, throttle)
        return
      }),
    )
  }

  clearThrottleInterval()

  const reEncodedRelatedAssetIndex = encodeRelatedAssetIndex(relatedAssetIndex, sortedAssetIds)
  const reEncodedAssetData = encodeAssetData(sortedAssetIds, generatedAssetData)

  await fs.promises.writeFile(ASSET_DATA_PATH, JSON.stringify(reEncodedAssetData))
  await fs.promises.writeFile(RELATED_ASSET_INDEX_PATH, JSON.stringify(reEncodedRelatedAssetIndex))

  console.info(`generateRelatedAssetIndex() done. Successes: ${happyCount}, Failures: ${sadCount}`)
  return
}
