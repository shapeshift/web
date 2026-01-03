import pLimit from 'p-limit'

const COINGECKO_BASE_URL = 'https://api.proxy.shapeshift.com/api/v1/markets'

type CoingeckoTrendingResponse = {
  coins: {
    item: {
      id: string
      name: string
      symbol: string
      market_cap_rank: number | null
      thumb: string
      small: string
      large: string
      score: number
    }
  }[]
}

type CoingeckoMoversResponse = {
  top_gainers: CoingeckoMoverRaw[]
  top_losers: CoingeckoMoverRaw[]
}

type CoingeckoMoverRaw = {
  id: string
  name: string
  symbol: string
  price_change_percentage_24h: number
  market_cap: number | null
  market_cap_rank: number | null
  thumb: string
  small: string
  large: string
}

type CoingeckoRecentlyAddedRaw = {
  id: string
  name: string
  symbol: string
  activated_at: number
}

type CoingeckoMarketCapRaw = {
  id: string
  symbol: string
  name: string
  image: string | null
  current_price: number
  market_cap: number
  market_cap_rank: number | null
  fully_diluted_valuation: number | null
  total_volume: number
  high_24h: number | null
  low_24h: number | null
  price_change_24h: number | null
  price_change_percentage_24h: number | null
  market_cap_change_24h: number | null
  market_cap_change_percentage_24h: number | null
  circulating_supply: number | null
  total_supply: number | null
  max_supply: number | null
  ath: number | null
  ath_change_percentage: number | null
  ath_date: string | null
  atl: number | null
  atl_change_percentage: number | null
  atl_date: string | null
  last_updated: string | null
}

export type CoingeckoTrendingCoin = {
  id: string
  name: string
  symbol: string
  marketCapRank: number | null
  thumb: string | null
  small: string | null
  large: string | null
  score: number | null
}

export type CoingeckoMover = {
  id: string
  name: string
  symbol: string
  priceChangePercentage24h: number
  marketCap: number | null
  marketCapRank: number | null
  thumb: string | null
  small: string | null
  large: string | null
}

export type CoingeckoTopMovers = {
  topGainers: CoingeckoMover[]
  topLosers: CoingeckoMover[]
}

export type CoingeckoRecentlyAddedCoin = {
  id: string
  name: string
  symbol: string
  activatedAt: number | null
}

export type CoingeckoMarketCap = {
  id: string
  symbol: string
  name: string
  image: string | null
  currentPrice: number
  marketCap: number
  marketCapRank: number | null
  fullyDilutedValuation: number | null
  totalVolume: number
  high24h: number | null
  low24h: number | null
  priceChange24h: number | null
  priceChangePercentage24h: number | null
  marketCapChange24h: number | null
  marketCapChangePercentage24h: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null
  ath: number | null
  athChangePercentage: number | null
  athDate: string | null
  atl: number | null
  atlChangePercentage: number | null
  atlDate: string | null
  lastUpdated: string | null
}

export type CoingeckoSortKey =
  | 'market_cap_asc'
  | 'market_cap_desc'
  | 'volume_asc'
  | 'volume_desc'
  | 'id_asc'
  | 'id_desc'
  | 'price_change_percentage_24h_desc'
  | 'price_change_percentage_24h_asc'

// Cache for CoinGecko data (simple TTL cache)
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL_MS = 60 * 1000 // 1 minute

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export async function getTrending(): Promise<CoingeckoTrendingCoin[]> {
  const cacheKey = 'trending'
  const cached = getCached<CoingeckoTrendingCoin[]>(cacheKey)
  if (cached) {
    console.log('[CoinGecko] Returning cached trending data')
    return cached
  }

  console.log('[CoinGecko] Fetching trending coins')
  const data = await fetchJson<CoingeckoTrendingResponse>(`${COINGECKO_BASE_URL}/search/trending`)

  const result = data.coins.map(({ item }) => ({
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    marketCapRank: item.market_cap_rank,
    thumb: item.thumb,
    small: item.small,
    large: item.large,
    score: item.score,
  }))

  setCache(cacheKey, result)
  return result
}

export async function getTopMovers(): Promise<CoingeckoTopMovers> {
  const cacheKey = 'topMovers'
  const cached = getCached<CoingeckoTopMovers>(cacheKey)
  if (cached) {
    console.log('[CoinGecko] Returning cached top movers data')
    return cached
  }

  console.log('[CoinGecko] Fetching top movers')
  const data = await fetchJson<CoingeckoMoversResponse>(
    `${COINGECKO_BASE_URL}/coins/top_gainers_losers?vs_currency=usd`,
  )

  const mapMover = (m: CoingeckoMoverRaw): CoingeckoMover => ({
    id: m.id,
    name: m.name,
    symbol: m.symbol,
    priceChangePercentage24h: m.price_change_percentage_24h,
    marketCap: m.market_cap,
    marketCapRank: m.market_cap_rank,
    thumb: m.thumb,
    small: m.small,
    large: m.large,
  })

  const result = {
    topGainers: data.top_gainers.map(mapMover),
    topLosers: data.top_losers.map(mapMover),
  }

  setCache(cacheKey, result)
  return result
}

export async function getRecentlyAdded(): Promise<CoingeckoRecentlyAddedCoin[]> {
  const cacheKey = 'recentlyAdded'
  const cached = getCached<CoingeckoRecentlyAddedCoin[]>(cacheKey)
  if (cached) {
    console.log('[CoinGecko] Returning cached recently added data')
    return cached
  }

  console.log('[CoinGecko] Fetching recently added coins')
  const data = await fetchJson<CoingeckoRecentlyAddedRaw[]>(`${COINGECKO_BASE_URL}/coins/list/new`)

  const result = data.map(coin => ({
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    activatedAt: coin.activated_at,
  }))

  setCache(cacheKey, result)
  return result
}

function mapMarketCap(raw: CoingeckoMarketCapRaw): CoingeckoMarketCap {
  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name,
    image: raw.image,
    currentPrice: raw.current_price,
    marketCap: raw.market_cap,
    marketCapRank: raw.market_cap_rank,
    fullyDilutedValuation: raw.fully_diluted_valuation,
    totalVolume: raw.total_volume,
    high24h: raw.high_24h,
    low24h: raw.low_24h,
    priceChange24h: raw.price_change_24h,
    priceChangePercentage24h: raw.price_change_percentage_24h,
    marketCapChange24h: raw.market_cap_change_24h,
    marketCapChangePercentage24h: raw.market_cap_change_percentage_24h,
    circulatingSupply: raw.circulating_supply,
    totalSupply: raw.total_supply,
    maxSupply: raw.max_supply,
    ath: raw.ath,
    athChangePercentage: raw.ath_change_percentage,
    athDate: raw.ath_date,
    atl: raw.atl,
    atlChangePercentage: raw.atl_change_percentage,
    atlDate: raw.atl_date,
    lastUpdated: raw.last_updated,
  }
}

export async function getMarkets(
  order: CoingeckoSortKey,
  page: number = 1,
  perPage: number = 100,
): Promise<CoingeckoMarketCap[]> {
  const cacheKey = `markets:${order}:${page}:${perPage}`
  const cached = getCached<CoingeckoMarketCap[]>(cacheKey)
  if (cached) {
    console.log(`[CoinGecko] Returning cached markets data (page ${page})`)
    return cached
  }

  console.log(`[CoinGecko] Fetching markets (order=${order}, page=${page}, perPage=${perPage})`)
  const data = await fetchJson<CoingeckoMarketCapRaw[]>(
    `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=${order}&per_page=${perPage}&page=${page}&sparkline=false`,
  )

  const result = data.map(mapMarketCap)
  setCache(cacheKey, result)
  return result
}

// Limit concurrent requests to avoid rate limiting
const limit = pLimit(3)

export async function getTopMarkets(
  count: number = 2500,
  order: CoingeckoSortKey = 'market_cap_desc',
): Promise<CoingeckoMarketCap[]> {
  const cacheKey = `topMarkets:${order}:${count}`
  const cached = getCached<CoingeckoMarketCap[]>(cacheKey)
  if (cached) {
    console.log(`[CoinGecko] Returning cached top markets data (${count} assets)`)
    return cached
  }

  const maxPerPage = 250
  const perPage = count < maxPerPage ? count : maxPerPage
  const totalPages = Math.ceil(count / perPage)

  console.log(`[CoinGecko] Fetching top ${count} markets in ${totalPages} pages`)

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  const pageResults = await Promise.all(
    pageNumbers.map(page =>
      limit(async () => {
        console.log(`[CoinGecko] Fetching page ${page}/${totalPages}`)
        const data = await fetchJson<CoingeckoMarketCapRaw[]>(
          `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=${order}&per_page=${perPage}&page=${page}&sparkline=false`,
        )
        return data.map(mapMarketCap)
      }),
    ),
  )

  const result = pageResults.flat()
  setCache(cacheKey, result)
  console.log(`[CoinGecko] Fetched ${result.length} total market entries`)
  return result
}
