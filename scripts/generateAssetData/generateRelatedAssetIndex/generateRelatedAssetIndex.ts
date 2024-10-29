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
  solanaChainId,
} from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import { isEvmChainId } from '@shapeshiftoss/utils'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import path from 'path'
import type { CoingeckoAssetDetails } from 'lib/coingecko/types'
import type { PartialFields } from 'lib/types'
import { isToken } from 'lib/utils'

import { createThrottle } from '../utils'
import {
  coingeckoPlatformDetailsToMaybeAssetId,
  zerionImplementationToMaybeAssetId,
} from './mapping'
import { zerionFungiblesSchema } from './validators/fungible'

// NOTE: this must call the zerion api directly rather than our proxy because of rate limiting requirements
const ZERION_BASE_URL = 'https://api.zerion.io/v1'
const BATCH_SIZE = 100

const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'

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

const getCoingeckoRelatedAssetIds = async (
  assetId: AssetId,
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
): Promise<{ relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined> => {
  if (!isToken(assetId)) return
  // Yes, this means effectively the same but double wrap never hurts
  if (FEE_ASSET_IDS.includes(assetId)) return
  const { chainId, assetReference } = fromAssetId(assetId)
  const contractAddress = assetReference
  const coingeckoChain = adapters.chainIdToCoingeckoAssetPlatform(chainId)
  const coinUri = `${coingeckoChain}/contract/${contractAddress}?vs_currency=usd`
  const { data } = await axios.get<CoingeckoAssetDetails>(`${coingeckoBaseUrl}/coins/${coinUri}`)

  const platforms = data.platforms
  const primaryPlatform = Object.entries(data.platforms)[0]

  const relatedAssetKey = primaryPlatform
    ? coingeckoPlatformDetailsToMaybeAssetId(primaryPlatform)
    : undefined

  const relatedAssetIds = Object.entries(platforms)
    ?.map(coingeckoPlatformDetailsToMaybeAssetId)
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
  assetData: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>>,
  relatedAssetIndex: Record<AssetId, AssetId[]>,
  throttle: () => Promise<void>,
): Promise<void> => {
  const existingRelatedAssetKey = assetData[assetId].relatedAssetKey
  // We already have an existing relatedAssetKey, so we don't need to fetch it again
  if (existingRelatedAssetKey !== undefined && fromAssetId(assetId).chainId !== solanaChainId)
    return

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
      return // Else, early return as this asset is already processed
    }
  }

  const zerionRelatedAssetsResult = await getZerionRelatedAssetIds(assetId, assetData)
    .then(result => {
      happyCount++
      return result
    })
    .catch(() => {
      sadCount++
      return undefined
    })

  const coingeckoRelatedAssetsResult = await getCoingeckoRelatedAssetIds(assetId, assetData)
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
    manualRelatedAssetsResult?.relatedAssetKey ||
    zerionRelatedAssetsResult?.relatedAssetKey ||
    coingeckoRelatedAssetsResult?.relatedAssetKey ||
    assetId

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

  // Has zerion-provided related assets, or manually added ones
  const hasRelatedAssets = mergedRelatedAssetIds.length > 1

  if (hasRelatedAssets) {
    // attach the relatedAssetKey for all related assets including the primary implementation
    for (const relatedAssetId of mergedRelatedAssetIds) {
      if (assetData[relatedAssetId]) {
        assetData[relatedAssetId].relatedAssetKey = relatedAssetKey
      }
    }
    relatedAssetIndex[relatedAssetKey] = mergedRelatedAssetIds
  } else {
    // If there are no related assets, set relatedAssetKey to null
    assetData[assetId].relatedAssetKey = null
  }

  await throttle()
}

// Change me to true to do a full rebuild of related asset indexes - defaults to false so we don't have endless generation scripts.
export const generateRelatedAssetIndex = async (rebuildAll: boolean = false) => {
  console.log(`generateRelatedAssetIndex() starting (rebuildAll: ${rebuildAll})`)

  const generatedAssetsPath = path.join(
    __dirname,
    '../../../src/lib/asset-service/service/generatedAssetData.json',
  )
  const relatedAssetIndexPath = path.join(
    __dirname,
    '../../../src/lib/asset-service/service/relatedAssetIndex.json',
  )

  const generatedAssetData: AssetsById = JSON.parse(
    await fs.promises.readFile(generatedAssetsPath, 'utf8'),
  )
  const relatedAssetIndex: Record<AssetId, AssetId[]> = JSON.parse(
    await fs.promises.readFile(relatedAssetIndexPath, 'utf8'),
  )
  const assetDataWithRelatedAssetKeys: Record<AssetId, PartialFields<Asset, 'relatedAssetKey'>> = {
    ...generatedAssetData,
  }

  if (rebuildAll) {
    // remove relatedAssetKey from the existing data to ensure the related assets get updated
    Object.values(assetDataWithRelatedAssetKeys).forEach(asset => delete asset.relatedAssetKey)
  }

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
          assetDataWithRelatedAssetKeys,
          relatedAssetIndex,
          throttle,
        )
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
