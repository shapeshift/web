import type { AssetId } from '@shapeshiftoss/caip'
import { FEE_ASSET_IDS, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { AssetsById } from '@shapeshiftoss/types'
import assert from 'assert'
import axios from 'axios'
import { Presets, SingleBar } from 'cli-progress'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import path from 'path'

import { zerionImplementationToMaybeAssetId } from './mapping'
import { zerionFungiblesSchema } from './validators/fungible'

const ZERION_BASE_URL = 'https://api.zerion.io/v1'
const BATCH_SIZE = 100

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

export const createThrottle = ({
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

  setInterval(() => {
    currentLevel = Math.max(0, currentLevel - drainPerInterval)
  }, intervalMs)

  const throttle = async () => {
    let isFull = currentLevel + costPerReq >= capacity
    while (isFull) {
      await new Promise(resolve => setTimeout(resolve, intervalMs))
      isFull = currentLevel + costPerReq >= capacity
    }
  }

  return throttle
}

const getRelatedAssetIds = async (
  assetId: AssetId,
  assetData: AssetsById,
): Promise<{ relatedAssetIds: AssetId[]; relatedAssetKey: AssetId } | undefined> => {
  assert(process.env.ZERION_API_KEY !== undefined, 'Missing Zerion API key')
  const basicAuth = 'Basic ' + Buffer.from(process.env.ZERION_API_KEY + ':').toString('base64')

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
  const { data: res, status, statusText } = await axios.request(payload)

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
    .filter(relatedAssetId => relatedAssetId !== assetId && assetData[relatedAssetId] !== undefined)

  if (!relatedAssetKey || !relatedAssetIds || relatedAssetIds.length === 0) {
    return
  }

  return { relatedAssetIds, relatedAssetKey }
}

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

  // ensure empty results get added so we can use this index to generate distinct asset list
  const { relatedAssetIds, relatedAssetKey } = relatedAssetsResult ?? {
    relatedAssetIds: [],
    relatedAssetKey: assetId,
  }

  for (const assetId of relatedAssetIds) {
    assetData[assetId].relatedAssetKey = relatedAssetKey
  }
  relatedAssetIndex[relatedAssetKey] = relatedAssetIds
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

  const progressBar = new SingleBar({}, Presets.shades_classic)
  progressBar.start(Object.keys(generatedAssetData).length, 0)

  const throttle = createThrottle({
    capacity: 150,
    costPerReq: 1,
    drainPerInterval: 150,
    intervalMs: 1000,
  })

  let i = 0
  for (const batch of chunkArray(Object.keys(generatedAssetData), BATCH_SIZE)) {
    await Promise.all(
      batch.map(async assetId => {
        await processRelatedAssetIds(assetId, assetDataWithRelatedAssetKeys, relatedAssetIndex)
        await throttle()
      }),
    )
    i += BATCH_SIZE
    progressBar.update(i)
  }

  progressBar.stop()

  fs.writeFileSync(
    generatedAssetsPath,
    // beautify the file for github diff.
    JSON.stringify(assetDataWithRelatedAssetKeys, null, 2),
  )

  fs.writeFileSync(
    relatedAssetIndexPath,
    // beautify the file for github diff.
    JSON.stringify(relatedAssetIndex, null, 2),
  )

  console.info('generateRelatedAssetIndex() done')
}
