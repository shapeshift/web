import DataLoader from 'dataloader'
import pLimit from 'p-limit'

import { getPriceHistory as getCoingeckoPriceHistory } from '../datasources/coingeckoService.js'

export type PriceHistoryPoint = {
  date: number
  price: number
}

export type PriceHistoryResult = {
  assetId: string
  data: PriceHistoryPoint[]
  error: string | null
}

export type PriceHistoryKey = {
  assetId: string
  coingeckoId: string
  timeframe: string
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes for historical data
const MAX_CACHE_ENTRIES = 5000

type CachedPriceHistory = {
  data: PriceHistoryPoint[]
  expiry: number
}

const cache = new Map<string, CachedPriceHistory>()

const limit = pLimit(5)

function getCacheKey(assetId: string, timeframe: string): string {
  return `${assetId}:${timeframe}`
}

function getCached(key: string): PriceHistoryPoint[] | null {
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: PriceHistoryPoint[]): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    console.warn(
      `[PriceHistoryLoader] Cache limit reached (${MAX_CACHE_ENTRIES}), clearing oldest entries`,
    )
    const entriesToDelete = Math.floor(MAX_CACHE_ENTRIES / 4)
    const keys = Array.from(cache.keys()).slice(0, entriesToDelete)
    keys.forEach(k => cache.delete(k))
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS })
}

function timeframeToRange(timeframe: string): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000)
  switch (timeframe) {
    case 'HOUR':
      return { from: to - 3600, to }
    case 'DAY':
      return { from: to - 86400, to }
    case 'WEEK':
      return { from: to - 7 * 86400, to }
    case 'MONTH':
      return { from: to - 30 * 86400, to }
    case 'YEAR':
      return { from: to - 365 * 86400, to }
    case 'ALL':
      return { from: 0, to }
    default:
      return { from: to - 86400, to }
  }
}

async function batchGetPriceHistory(
  keys: readonly PriceHistoryKey[],
): Promise<PriceHistoryResult[]> {
  console.log(`[PriceHistoryLoader] Batching ${keys.length} price history requests`)

  const results: PriceHistoryResult[] = []
  const uncachedKeys: { key: PriceHistoryKey; index: number }[] = []

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const cacheKey = getCacheKey(key.assetId, key.timeframe)
    const cached = getCached(cacheKey)

    if (cached) {
      results[i] = { assetId: key.assetId, data: cached, error: null }
    } else {
      results[i] = { assetId: key.assetId, data: [], error: null }
      uncachedKeys.push({ key, index: i })
    }
  }

  if (uncachedKeys.length === 0) {
    console.log(`[PriceHistoryLoader] All ${keys.length} requests served from cache`)
    return results
  }

  console.log(
    `[PriceHistoryLoader] Cache hit: ${keys.length - uncachedKeys.length}, fetching: ${
      uncachedKeys.length
    }`,
  )

  await Promise.all(
    uncachedKeys.map(({ key, index }) =>
      limit(async () => {
        try {
          const { from, to } = timeframeToRange(key.timeframe)

          if (!key.coingeckoId) {
            results[index] = {
              assetId: key.assetId,
              data: [],
              error: 'No coingeckoId provided',
            }
            return
          }

          const data = await getCoingeckoPriceHistory(key.coingeckoId, from, to)
          const cacheKey = getCacheKey(key.assetId, key.timeframe)
          setCache(cacheKey, data)

          results[index] = { assetId: key.assetId, data, error: null }
        } catch (error) {
          console.error(
            `[PriceHistoryLoader] Error fetching price history for ${key.assetId}:`,
            error,
          )
          results[index] = {
            assetId: key.assetId,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      }),
    ),
  )

  return results
}

export function createPriceHistoryLoader(): DataLoader<PriceHistoryKey, PriceHistoryResult> {
  return new DataLoader<PriceHistoryKey, PriceHistoryResult>(batchGetPriceHistory, {
    cache: false,
    maxBatchSize: 100,
  })
}

export function clearPriceHistoryCache(): void {
  cache.clear()
}
