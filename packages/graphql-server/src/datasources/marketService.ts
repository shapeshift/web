import { adapters, foxAssetId, foxOnArbitrumOneAssetId, isNft } from '@shapeshiftoss/caip'
import axios from 'axios'
import pLimit from 'p-limit'

// Limit concurrent upstream API requests to prevent hammering providers
const upstreamRequestLimit = pLimit(5)

// Aligned with packages/types/src/market.ts MarketData
export type MarketData = {
  assetId: string
  price: string
  marketCap: string
  volume: string
  changePercent24Hr: number
  supply?: string
  maxSupply?: string
}

// CoinGecko response types
type CoinGeckoMarketCap = {
  id: string
  current_price: number
  market_cap: number
  total_volume: number
  price_change_percentage_24h: number
  circulating_supply: number
  total_supply: number | null
  max_supply: number | null
}

// CoinCap response types
type CoinCapAsset = {
  id: string
  rank: string
  symbol: string
  name: string
  supply: string
  maxSupply: string | null
  marketCapUsd: string
  volumeUsd24Hr: string
  priceUsd: string
  changePercent24Hr: string
}

type CoinCapResponse = {
  data: CoinCapAsset[]
  timestamp: number
}

// MarketService interface matching the existing pattern in src/lib/market-service/api.ts
interface MarketService {
  name: string
  findByAssetIds(assetIds: string[]): Promise<Map<string, MarketData>>
}

/**
 * CoinGecko Market Service - Primary provider
 * Mirrors: src/lib/market-service/coingecko/coingecko.ts
 */
class CoinGeckoService implements MarketService {
  name = 'CoinGecko'
  private baseUrl = adapters.coingeckoBaseUrl

  async findByAssetIds(assetIds: string[]): Promise<Map<string, MarketData>> {
    const result = new Map<string, MarketData>()

    // Convert assetIds to CoinGecko IDs
    // Handle Arb FOX → mainnet FOX mapping (same as existing market-service)
    const assetIdToCoinGeckoId = new Map<string, string>()
    for (const assetId of assetIds) {
      const normalizedAssetId = assetId === foxOnArbitrumOneAssetId ? foxAssetId : assetId
      const coinGeckoId = adapters.assetIdToCoingecko(normalizedAssetId)
      if (coinGeckoId) {
        assetIdToCoinGeckoId.set(assetId, coinGeckoId)
      }
    }

    if (assetIdToCoinGeckoId.size === 0) return result

    const coinGeckoIds = [...new Set(assetIdToCoinGeckoId.values())]

    // Batch in chunks of 250 (CoinGecko limit)
    const chunkSize = 250
    const coinGeckoData = new Map<string, CoinGeckoMarketCap>()

    for (let i = 0; i < coinGeckoIds.length; i += chunkSize) {
      const chunk = coinGeckoIds.slice(i, i + chunkSize)
      try {
        const idsParam = chunk.join(',')
        const url = `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${idsParam}&sparkline=false`
        const { data } = await upstreamRequestLimit(() =>
          axios.get<CoinGeckoMarketCap[]>(url, { timeout: 10000 }),
        )
        for (const item of data) {
          coinGeckoData.set(item.id, item)
        }
      } catch (error) {
        console.warn(`[CoinGecko] Failed to fetch chunk:`, error)
      }
    }

    // Transform and map back to assetIds
    for (const [assetId, coinGeckoId] of assetIdToCoinGeckoId) {
      const cgData = coinGeckoData.get(coinGeckoId)
      if (cgData) {
        result.set(assetId, {
          assetId,
          price: cgData.current_price?.toString() ?? '0',
          marketCap: cgData.market_cap?.toString() ?? '0',
          volume: cgData.total_volume?.toString() ?? '0',
          changePercent24Hr: cgData.price_change_percentage_24h ?? 0,
          supply: cgData.circulating_supply?.toString(),
          maxSupply: cgData.max_supply?.toString() ?? cgData.total_supply?.toString(),
        })
      }
    }

    return result
  }
}

/**
 * CoinCap Market Service - Secondary/fallback provider
 * Mirrors: src/lib/market-service/coincap/coincap.ts
 */
class CoinCapService implements MarketService {
  name = 'CoinCap'
  private baseUrl = 'https://rest.coincap.io/v3'

  async findByAssetIds(assetIds: string[]): Promise<Map<string, MarketData>> {
    const result = new Map<string, MarketData>()

    // Convert assetIds to CoinCap IDs
    const assetIdToCoinCapId = new Map<string, string>()
    for (const assetId of assetIds) {
      const coinCapId = adapters.assetIdToCoinCap(assetId)
      if (coinCapId) {
        assetIdToCoinCapId.set(assetId, coinCapId)
      }
    }

    if (assetIdToCoinCapId.size === 0) return result

    const coinCapIds = [...new Set(assetIdToCoinCapId.values())]

    try {
      // CoinCap supports comma-separated IDs
      const idsParam = coinCapIds.join(',')
      const url = `${this.baseUrl}/assets?ids=${idsParam}`
      const { data: response } = await upstreamRequestLimit(() =>
        axios.get<CoinCapResponse>(url, { timeout: 10000 }),
      )

      const coinCapData = new Map<string, CoinCapAsset>()
      for (const asset of response.data) {
        coinCapData.set(asset.id, asset)
      }

      // Transform and map back to assetIds
      for (const [assetId, coinCapId] of assetIdToCoinCapId) {
        const ccData = coinCapData.get(coinCapId)
        if (ccData) {
          result.set(assetId, {
            assetId,
            price: ccData.priceUsd,
            marketCap: ccData.marketCapUsd,
            volume: ccData.volumeUsd24Hr,
            changePercent24Hr: parseFloat(ccData.changePercent24Hr) || 0,
            supply: ccData.supply,
            maxSupply: ccData.maxSupply ?? undefined,
          })
        }
      }
    } catch (error) {
      console.warn(`[CoinCap] Failed to fetch:`, error)
    }

    return result
  }
}

/**
 * Unified Market Service Manager with provider fallback chain
 *
 * Mirrors the pattern from: src/lib/market-service/market-service-manager.ts
 *
 * Key behavior (same as existing):
 * - Providers are tried in priority order
 * - For each unfound asset, we fall through to the next provider
 * - Once all providers are exhausted, we return whatever we found
 *
 * DataLoader optimization:
 * - Batch fetching per provider (vs one-at-a-time in original)
 * - Reduces N+1 queries to N providers + 1 batch per provider
 */
export class MarketServiceManager {
  private providers: MarketService[]

  constructor() {
    // Order constitutes fallback priority - more reliable providers first
    // Same order as existing market-service-manager.ts
    this.providers = [
      new CoinGeckoService(),
      new CoinCapService(),
      // TODO: Add more providers as needed:
      // - PortalsMarketService (good for LP tokens)
      // - ThorchainAssetsMarketService
      // - ZerionMarketService
    ]
  }

  /**
   * Find market data for multiple assets with provider fallback
   *
   * Algorithm (same exhaustion logic as existing market-service):
   * 1. Start with all requested assetIds as "pending"
   * 2. For each provider in priority order:
   *    a. Fetch data for all pending assetIds
   *    b. Move found assets from pending to results
   *    c. If no pending assets remain, stop early
   * 3. Return all found results (unfound assets return null)
   */
  async findByAssetIds(assetIds: string[]): Promise<Map<string, MarketData>> {
    const result = new Map<string, MarketData>()

    // Filter out NFTs (same as existing market-service)
    const validAssetIds = assetIds.filter(id => !isNft(id))
    if (validAssetIds.length === 0) return result

    // Track which assetIds still need data
    let pendingAssetIds = new Set(validAssetIds)

    // Try each provider in order until we have all data (exhaustion pattern)
    for (const provider of this.providers) {
      if (pendingAssetIds.size === 0) break

      console.log(`[MarketService] Trying ${provider.name} for ${pendingAssetIds.size} assets`)

      try {
        const providerResult = await provider.findByAssetIds([...pendingAssetIds])

        // Move found assets from pending to result
        for (const [assetId, data] of providerResult) {
          result.set(assetId, data)
          pendingAssetIds.delete(assetId)
        }

        console.log(
          `[MarketService] ${provider.name} returned ${providerResult.size} results, ` +
            `${pendingAssetIds.size} still pending`,
        )
      } catch (error) {
        // Swallow error, try next provider (same as existing market-service)
        console.warn(`[MarketService] ${provider.name} failed:`, error)
      }
    }

    if (pendingAssetIds.size > 0) {
      console.log(
        `[MarketService] Could not find data for ${pendingAssetIds.size} assets: ` +
          `${[...pendingAssetIds].slice(0, 3).join(', ')}${pendingAssetIds.size > 3 ? '...' : ''}`,
      )
    }

    return result
  }
}

// Singleton instance for request-scoped caching
let marketServiceInstance: MarketServiceManager | null = null

export function getMarketService(): MarketServiceManager {
  if (!marketServiceInstance) {
    marketServiceInstance = new MarketServiceManager()
  }
  return marketServiceInstance
}
