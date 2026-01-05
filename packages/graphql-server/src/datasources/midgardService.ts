const MIDGARD_URL = 'https://midgard.ninerealms.com/v2'

const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds for Midgard data

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Midgard API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}
export type MidgardPoolPeriod =
  | '1h'
  | '24h'
  | '7d'
  | '14d'
  | '30d'
  | '90d'
  | '100d'
  | '180d'
  | '365d'
  | 'all'

export type MidgardPool = {
  asset: string
  annualPercentageRate: string
  assetDepth: string
  assetPrice: string
  assetPriceUSD: string
  liquidityUnits: string
  nativeDecimal: string
  poolAPY: string
  runeDepth: string
  saversAPR: string
  saversDepth: string
  saversUnits: string
  status: string
  synthSupply: string
  synthUnits: string
  units: string
  volume24h: string
}

type MidgardPoolRaw = {
  asset: string
  annualPercentageRate: string
  assetDepth: string
  assetPrice: string
  assetPriceUSD: string
  liquidityUnits: string
  nativeDecimal: string
  poolAPY: string
  runeDepth: string
  saversAPR: string
  saversDepth: string
  saversUnits: string
  status: string
  synthSupply: string
  synthUnits: string
  units: string
  volume24h: string
}

export type MidgardMemberPool = {
  assetAdded: string
  assetAddress: string
  assetDeposit: string
  assetPending: string
  assetWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
  liquidityUnits: string
  pool: string
  runeAdded: string
  runeAddress: string
  runeDeposit: string
  runePending: string
  runeWithdrawn: string
}

export type MidgardMember = {
  pools: MidgardMemberPool[]
}

type MidgardMemberRaw = {
  pools: {
    assetAdded: string
    assetAddress: string
    assetDeposit: string
    assetPending: string
    assetWithdrawn: string
    dateFirstAdded: string
    dateLastAdded: string
    liquidityUnits: string
    pool: string
    runeAdded: string
    runeAddress: string
    runeDeposit: string
    runePending: string
    runeWithdrawn: string
  }[]
}

export type MidgardRunepoolMember = {
  runeAddress: string
  units: string
  runeAdded: string
  runeDeposit: string
  runeWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
}

type MidgardRunepoolMemberRaw = {
  runeAddress: string
  units: string
  runeAdded: string
  runeDeposit: string
  runeWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
}

export async function getPools(period?: MidgardPoolPeriod): Promise<MidgardPool[]> {
  const cacheKey = `midgard:pools:${period ?? 'default'}`
  const cached = getCached<MidgardPool[]>(cacheKey)
  if (cached) {
    console.log(`[Midgard] Returning cached pools (period=${period ?? 'default'})`)
    return cached
  }

  console.log(`[Midgard] Fetching pools (period=${period ?? 'default'})`)
  const url = period ? `${MIDGARD_URL}/pools?period=${period}` : `${MIDGARD_URL}/pools`

  try {
    const data = await fetchJson<MidgardPoolRaw[]>(url)
    const result: MidgardPool[] = data.map(pool => ({
      asset: pool.asset,
      annualPercentageRate: pool.annualPercentageRate,
      assetDepth: pool.assetDepth,
      assetPrice: pool.assetPrice,
      assetPriceUSD: pool.assetPriceUSD,
      liquidityUnits: pool.liquidityUnits,
      nativeDecimal: pool.nativeDecimal,
      poolAPY: pool.poolAPY,
      runeDepth: pool.runeDepth,
      saversAPR: pool.saversAPR,
      saversDepth: pool.saversDepth,
      saversUnits: pool.saversUnits,
      status: pool.status,
      synthSupply: pool.synthSupply,
      synthUnits: pool.synthUnits,
      units: pool.units,
      volume24h: pool.volume24h,
    }))
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`[Midgard] Failed to fetch pools:`, error)
    return []
  }
}

export async function getMember(address: string): Promise<MidgardMember | null> {
  const cacheKey = `midgard:member:${address}`
  const cached = getCached<MidgardMember>(cacheKey)
  if (cached) {
    console.log(`[Midgard] Returning cached member for ${address}`)
    return cached
  }

  console.log(`[Midgard] Fetching member for ${address}`)

  try {
    const data = await fetchJson<MidgardMemberRaw>(`${MIDGARD_URL}/member/${address}`)
    const result: MidgardMember = {
      pools: data.pools.map(pool => ({
        assetAdded: pool.assetAdded,
        assetAddress: pool.assetAddress,
        assetDeposit: pool.assetDeposit,
        assetPending: pool.assetPending,
        assetWithdrawn: pool.assetWithdrawn,
        dateFirstAdded: pool.dateFirstAdded,
        dateLastAdded: pool.dateLastAdded,
        liquidityUnits: pool.liquidityUnits,
        pool: pool.pool,
        runeAdded: pool.runeAdded,
        runeAddress: pool.runeAddress,
        runeDeposit: pool.runeDeposit,
        runePending: pool.runePending,
        runeWithdrawn: pool.runeWithdrawn,
      })),
    }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`[Midgard] Failed to fetch member ${address}:`, error)
    return null
  }
}

export async function getRunepoolMember(address: string): Promise<MidgardRunepoolMember | null> {
  const cacheKey = `midgard:runepool:${address}`
  const cached = getCached<MidgardRunepoolMember>(cacheKey)
  if (cached) {
    console.log(`[Midgard] Returning cached runepool member for ${address}`)
    return cached
  }

  console.log(`[Midgard] Fetching runepool member for ${address}`)

  try {
    const data = await fetchJson<MidgardRunepoolMemberRaw>(`${MIDGARD_URL}/runepool/${address}`)
    const result: MidgardRunepoolMember = {
      runeAddress: data.runeAddress,
      units: data.units,
      runeAdded: data.runeAdded,
      runeDeposit: data.runeDeposit,
      runeWithdrawn: data.runeWithdrawn,
      dateFirstAdded: data.dateFirstAdded,
      dateLastAdded: data.dateLastAdded,
    }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`[Midgard] Failed to fetch runepool member ${address}:`, error)
    return null
  }
}

export type MidgardSaver = {
  pools: {
    pool: string
    dateLastAdded: string
  }[]
}

export async function getSaver(address: string): Promise<MidgardSaver | null> {
  const cacheKey = `midgard:saver:${address}`
  const cached = getCached<MidgardSaver>(cacheKey)
  if (cached) {
    console.log(`[Midgard] Returning cached saver for ${address}`)
    return cached
  }

  console.log(`[Midgard] Fetching saver for ${address}`)

  try {
    const data = await fetchJson<MidgardSaver>(`${MIDGARD_URL}/saver/${address}`)
    setCache(cacheKey, data)
    return data
  } catch (error) {
    console.error(`[Midgard] Failed to fetch saver ${address}:`, error)
    return null
  }
}
