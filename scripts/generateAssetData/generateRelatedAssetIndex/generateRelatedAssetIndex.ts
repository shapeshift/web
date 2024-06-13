import type { AssetId } from '@shapeshiftoss/caip'
import {
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
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { AssetsById } from '@shapeshiftoss/types'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import path from 'path'

import { zerionImplementationToMaybeAssetId } from './mapping'
import { zerionFungiblesSchema } from './validators/fungible'

// NOTE: this must call the zerion api directly rather than our proxy because of rate limiting requirements
const ZERION_BASE_URL = 'https://api.zerion.io/v1'
const BATCH_SIZE = 100

const axiosInstance = axios.create()
axiosRetry(axiosInstance, { retries: 5, retryDelay: axiosRetry.exponentialDelay })

const ZERION_API_KEY = process.env.ZERION_API_KEY
if (!ZERION_API_KEY) throw new Error('Missing Zerion API key - see readme for instructions')

const manualRelatedAssetIndex: Record<AssetId, AssetId[]> = {
  [ethAssetId]: [
    optimismAssetId,
    arbitrumAssetId,
    arbitrumNovaAssetId,
    baseAssetId,
    // WETH on Ethereum
    'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    // WETH on Gnosis
    'eip155:100/erc20:0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
    // WETH on Polygon
    'eip155:137/erc20:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    // WETH on Arbitrum One
    'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    // WETH on Arbitrum Nova
    'eip155:42170/erc20:0x722e8bdd2ce80a4422e880164f2079488e115365',
    // WETH on Avalanche
    'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
    // WETH on BSC
    'eip155:56/bep20:0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    // WETH on Optimism
    'eip155:10/erc20:0x4200000000000000000000000000000000000006',
  ],
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

const createThrottle = ({
  capacity,
  costPerReq,
  drainPerInterval,
  intervalMs,
}: {
  capacity: number
  costPerReq: number
  drainPerInterval: number
  intervalMs: number
}) => {
  let currentLevel = 0
  let pendingResolves: ((value?: unknown) => void)[] = []

  const drain = () => {
    const drainAmount = Math.min(currentLevel, drainPerInterval)
    currentLevel -= drainAmount

    // Resolve pending promises if there's enough capacity
    while (pendingResolves.length > 0 && currentLevel + costPerReq <= capacity) {
      const resolve = pendingResolves.shift()
      if (resolve) {
        currentLevel += costPerReq
        resolve()
      }
    }
  }

  // Start the interval to drain the capacity
  const intervalId = setInterval(drain, intervalMs)

  const throttle = async () => {
    if (currentLevel + costPerReq <= capacity) {
      // If adding another request doesn't exceed capacity, proceed immediately
      currentLevel += costPerReq
    } else {
      // Otherwise, wait until there's enough capacity
      await new Promise(resolve => {
        pendingResolves.push(resolve)
      })
    }
  }

  const clear = () => clearInterval(intervalId)

  return { throttle, clear }
}

const getRelatedAssetIds = async (
  assetId: AssetId,
  assetData: AssetsById,
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

  if (!isEvmChainId(chainId) || FEE_ASSET_IDS.includes(assetId)) return

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
  const primaryImplementationId = firstEntry.id

  const primaryImplementation = implementations?.find(
    implementation => implementation.address === primaryImplementationId,
  )

  const relatedAssetKey = primaryImplementation
    ? zerionImplementationToMaybeAssetId(primaryImplementation)
    : undefined

  const relatedAssetIds = implementations
    ?.map(zerionImplementationToMaybeAssetId)
    .filter(isSome)
    .filter(
      relatedAssetId =>
        relatedAssetId !== relatedAssetKey && assetData[relatedAssetId] !== undefined,
    )

  if (!relatedAssetKey || !relatedAssetIds || relatedAssetIds.length === 0) {
    return
  }

  return { relatedAssetIds, relatedAssetKey }
}

// Initialize counters for happy and sad fetches
let happyCount = 0
let sadCount = 0

const processRelatedAssetIds = async (
  assetId: AssetId,
  assetData: AssetsById,
  relatedAssetIndex: Record<AssetId, AssetId[]>,
): Promise<void> => {
  // don't fetch if we've already got the data from a previous request
  const existingRelatedAssetKey = assetData[assetId].relatedAssetKey
  if (existingRelatedAssetKey) {
    return
  }

  const relatedAssetsResult = await getRelatedAssetIds(assetId, assetData)
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

  const relatedAssetKey =
    manualRelatedAssetsResult?.relatedAssetKey || relatedAssetsResult?.relatedAssetKey || assetId

  const zerionRelatedAssetIds = relatedAssetsResult?.relatedAssetIds ?? []
  const mergedRelatedAssetIds = Array.from(
    new Set([...manualRelatedAssetIds, ...zerionRelatedAssetIds]),
  )

  // Has zerion-provided related assets, or manually added ones
  const hasRelatedAssets = mergedRelatedAssetIds.length > 0

  // attach the relatedAssetKey for all related assets including the primary implementation (where supported by us)
  if (hasRelatedAssets && assetData[relatedAssetKey] !== undefined) {
    assetData[relatedAssetKey].relatedAssetKey = relatedAssetKey
  }

  for (const assetId of mergedRelatedAssetIds) {
    assetData[assetId].relatedAssetKey = relatedAssetKey
  }
  relatedAssetIndex[relatedAssetKey] = mergedRelatedAssetIds
  return
}

export const generateRelatedAssetIndex = async () => {
  console.log('generateRelatedAssetIndex() starting')

  const generatedAssetsPath = path.join(
    __dirname,
    '../../../src/lib/asset-service/service/generatedAssetData.json',
  )
  const relatedAssetIndexPath = path.join(
    __dirname,
    '../../../src/lib/asset-service/service/relatedAssetIndex.json',
  )

  const generatedAssetData: AssetsById = require(generatedAssetsPath)
  const relatedAssetIndex: Record<AssetId, AssetId[]> = {}
  const assetDataWithRelatedAssetKeys: AssetsById = { ...generatedAssetData }

  // remove relatedAssetKey from the existing data to ensure the related assets get updated
  Object.values(assetDataWithRelatedAssetKeys).forEach(asset => delete asset.relatedAssetKey)

  const { throttle, clear: clearThrottleInterval } = createThrottle({
    capacity: 50, // Reduced initial capacity to allow for a burst but not too high
    costPerReq: 1, // Keeping the cost per request as 1 for simplicity
    drainPerInterval: 25, // Adjusted drain rate to replenish at a sustainable pace
    intervalMs: 2000,
  })
  for (const batch of chunkArray(Object.keys(generatedAssetData), BATCH_SIZE)) {
    await Promise.all(
      batch.map(async assetId => {
        await processRelatedAssetIds(assetId, assetDataWithRelatedAssetKeys, relatedAssetIndex)
        await throttle()
        return
      }),
    )
  }

  clearThrottleInterval()

  await fs.promises.writeFile(
    generatedAssetsPath,
    // beautify the file for github diff.
    JSON.stringify(assetDataWithRelatedAssetKeys, null, 2),
  )

  await fs.promises.writeFile(
    relatedAssetIndexPath,
    // beautify the file for github diff.
    JSON.stringify(relatedAssetIndex, null, 2),
  )

  console.info(`generateRelatedAssetIndex() done. Successes: ${happyCount}, Failures: ${sadCount}`)
  return
}
