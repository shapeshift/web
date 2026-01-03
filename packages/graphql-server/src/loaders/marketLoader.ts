import DataLoader from 'dataloader'

import type { MarketData } from '../datasources/marketService.js'
import { getMarketService } from '../datasources/marketService.js'

export type { MarketData }

// Cross-request TTL cache (singleton, shared across all users)
// DataLoader provides per-request batching/deduplication
const cache = new Map<string, { data: MarketData; expiry: number }>()
const CACHE_TTL_MS = 60_000 // 60 seconds
const MAX_CACHE_ENTRIES = 10_000

function getCachedMarketData(assetId: string): MarketData | null {
  const cached = cache.get(assetId)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }
  cache.delete(assetId)
  return null
}

function setCachedMarketData(assetId: string, data: MarketData): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    console.warn(`[MarketLoader] Cache limit reached (${MAX_CACHE_ENTRIES}), clearing cache`)
    cache.clear()
  }
  cache.set(assetId, { data, expiry: Date.now() + CACHE_TTL_MS })
}

// Batch function that fetches market data for multiple assets
async function batchGetMarketData(assetIds: readonly string[]): Promise<(MarketData | null)[]> {
  console.log(`[MarketLoader] Batching ${assetIds.length} asset requests`)

  // Check cache first
  const results: (MarketData | null)[] = []
  const uncachedAssetIds: string[] = []
  const uncachedIndices: number[] = []

  for (let i = 0; i < assetIds.length; i++) {
    const cached = getCachedMarketData(assetIds[i])
    if (cached) {
      results[i] = cached
    } else {
      uncachedAssetIds.push(assetIds[i])
      uncachedIndices.push(i)
      results[i] = null // placeholder
    }
  }

  if (uncachedAssetIds.length === 0) {
    console.log(`[MarketLoader] All ${assetIds.length} assets served from cache`)
    return results
  }

  console.log(
    `[MarketLoader] Fetching ${uncachedAssetIds.length} uncached assets from market service`,
  )

  try {
    // Use unified market service with fallback chain
    const marketService = getMarketService()
    const fetchedData = await marketService.findByAssetIds(uncachedAssetIds)

    // Map fetched data back to results
    for (let i = 0; i < uncachedAssetIds.length; i++) {
      const assetId = uncachedAssetIds[i]
      const marketData = fetchedData.get(assetId)

      if (marketData) {
        setCachedMarketData(assetId, marketData)
        results[uncachedIndices[i]] = marketData
      }
    }
  } catch (error) {
    console.error('[MarketLoader] Error fetching market data:', error)
  }

  return results
}

// Create a new DataLoader instance per request
// DataLoader cache is DISABLED to avoid race condition with our TTL cache
// Our custom cache provides cross-request caching with TTL expiry
export function createMarketDataLoader(): DataLoader<string, MarketData | null> {
  return new DataLoader<string, MarketData | null>(batchGetMarketData, {
    cache: false, // Use our custom TTL cache instead
    maxBatchSize: 100,
  })
}
