import DataLoader from 'dataloader'
import pLimit from 'p-limit'

export type ThornodeNetwork = 'thorchain' | 'mayachain'

const THORNODE_URL = 'https://thornode.ninerealms.com'
const MAYANODE_URL = 'https://mayanode.mayachain.info'

function getBaseUrl(network: ThornodeNetwork): string {
  switch (network) {
    case 'thorchain':
      return `${THORNODE_URL}/thorchain`
    case 'mayachain':
      return `${MAYANODE_URL}/mayachain`
    default:
      throw new Error(`Unknown network: ${network}`)
  }
}

// Types
export type TcyClaim = {
  address: string
  amount: string
  l1Address: string | null
  claimed: boolean | null
}

export type ThornodePool = {
  asset: string
  status: string
  balanceRune: string
  balanceAsset: string
  lpUnits: string | null
  synthUnits: string | null
  pendingInboundRune: string | null
  pendingInboundAsset: string | null
  saversDepth: string | null
  saversUnits: string | null
}

export type InboundAddress = {
  chain: string
  address: string
  router: string | null
  halted: boolean
  globalTradingPaused: boolean | null
  chainTradingPaused: boolean | null
  chainLpActionsPaused: boolean | null
  gasRate: string | null
  gasRateUnits: string | null
  outboundTxSize: string | null
  outboundFee: string | null
  dustThreshold: string | null
}

export type ThornodeBlock = {
  height: string
  hash: string | null
  timestamp: string | null
}

// Raw API response types
type TcyClaimerRaw = {
  l1_address: string
  rune_address: string
  amount: string
  claimed?: boolean
}

type PoolRaw = {
  asset: string
  status: string
  balance_rune: string
  balance_asset: string
  LP_units?: string
  synth_units?: string
  pending_inbound_rune?: string
  pending_inbound_asset?: string
  savers_depth?: string
  savers_units?: string
}

type InboundAddressRaw = {
  chain: string
  address: string
  router?: string
  halted: boolean
  global_trading_paused?: boolean
  chain_trading_paused?: boolean
  chain_lp_actions_paused?: boolean
  gas_rate?: string
  gas_rate_units?: string
  outbound_tx_size?: string
  outbound_fee?: string
  dust_threshold?: string
}

type BlockRaw = {
  header?: {
    height: string
    time: string
  }
  block_id?: {
    hash: string
  }
}

// Cache for simple queries (pools, mimir, etc.)
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL_MS = 30 * 1000 // 30 seconds for Thornode data

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
    throw new Error(`Thornode API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

// Limit concurrent requests
const limit = pLimit(5)

// TCY Claims DataLoader - batches multiple address lookups
function createTcyClaimsLoader(network: ThornodeNetwork) {
  return new DataLoader<string, TcyClaim | null>(
    async (addresses: readonly string[]): Promise<(TcyClaim | null)[]> => {
      console.log(`[Thornode] Batching ${addresses.length} TCY claim lookups`)
      const baseUrl = getBaseUrl(network)

      const results = await Promise.all(
        addresses.map(address =>
          limit(async (): Promise<TcyClaim | null> => {
            try {
              const data = await fetchJson<TcyClaimerRaw>(`${baseUrl}/tcy_claimer/${address}`)
              return {
                address: data.rune_address,
                amount: data.amount,
                l1Address: data.l1_address,
                claimed: data.claimed ?? null,
              }
            } catch (error) {
              // Address not found or error - return null
              return null
            }
          }),
        ),
      )

      return results
    },
    {
      cache: true,
      maxBatchSize: 50,
      // Use a batching window to collect requests across event loops
      batchScheduleFn: callback => setTimeout(callback, 16),
    },
  )
}

// Singleton loaders per network
const tcyLoaders = new Map<ThornodeNetwork, DataLoader<string, TcyClaim | null>>()

function getTcyLoader(network: ThornodeNetwork): DataLoader<string, TcyClaim | null> {
  let loader = tcyLoaders.get(network)
  if (!loader) {
    loader = createTcyClaimsLoader(network)
    tcyLoaders.set(network, loader)
  }
  return loader
}

// Public API
export async function getTcyClaims(
  addresses: string[],
  network: ThornodeNetwork = 'thorchain',
): Promise<(TcyClaim | null)[]> {
  const loader = getTcyLoader(network)
  const results = await loader.loadMany(addresses)
  return results.map(result => (result instanceof Error ? null : result))
}

export async function getPools(network: ThornodeNetwork = 'thorchain'): Promise<ThornodePool[]> {
  const cacheKey = `pools:${network}`
  const cached = getCached<ThornodePool[]>(cacheKey)
  if (cached) {
    console.log(`[Thornode] Returning cached pools for ${network}`)
    return cached
  }

  console.log(`[Thornode] Fetching pools for ${network}`)
  const baseUrl = getBaseUrl(network)
  const data = await fetchJson<PoolRaw[]>(`${baseUrl}/pools`)

  const result = data.map(pool => ({
    asset: pool.asset,
    status: pool.status,
    balanceRune: pool.balance_rune,
    balanceAsset: pool.balance_asset,
    lpUnits: pool.LP_units ?? null,
    synthUnits: pool.synth_units ?? null,
    pendingInboundRune: pool.pending_inbound_rune ?? null,
    pendingInboundAsset: pool.pending_inbound_asset ?? null,
    saversDepth: pool.savers_depth ?? null,
    saversUnits: pool.savers_units ?? null,
  }))

  setCache(cacheKey, result)
  return result
}

export async function getPool(
  asset: string,
  network: ThornodeNetwork = 'thorchain',
): Promise<ThornodePool | null> {
  const cacheKey = `pool:${network}:${asset}`
  const cached = getCached<ThornodePool>(cacheKey)
  if (cached) {
    return cached
  }

  console.log(`[Thornode] Fetching pool ${asset} for ${network}`)
  const baseUrl = getBaseUrl(network)

  try {
    const pool = await fetchJson<PoolRaw>(`${baseUrl}/pool/${asset}`)
    const result = {
      asset: pool.asset,
      status: pool.status,
      balanceRune: pool.balance_rune,
      balanceAsset: pool.balance_asset,
      lpUnits: pool.LP_units ?? null,
      synthUnits: pool.synth_units ?? null,
      pendingInboundRune: pool.pending_inbound_rune ?? null,
      pendingInboundAsset: pool.pending_inbound_asset ?? null,
      saversDepth: pool.savers_depth ?? null,
      saversUnits: pool.savers_units ?? null,
    }
    setCache(cacheKey, result)
    return result
  } catch {
    return null
  }
}

export async function getMimir(network: ThornodeNetwork = 'thorchain'): Promise<unknown> {
  const cacheKey = `mimir:${network}`
  const cached = getCached<unknown>(cacheKey)
  if (cached) {
    console.log(`[Thornode] Returning cached mimir for ${network}`)
    return cached
  }

  console.log(`[Thornode] Fetching mimir for ${network}`)
  const baseUrl = getBaseUrl(network)
  const data = await fetchJson<unknown>(`${baseUrl}/mimir`)
  setCache(cacheKey, data)
  return data
}

export async function getBlock(network: ThornodeNetwork = 'thorchain'): Promise<ThornodeBlock> {
  const cacheKey = `block:${network}`
  const cached = getCached<ThornodeBlock>(cacheKey)
  if (cached) {
    return cached
  }

  console.log(`[Thornode] Fetching block for ${network}`)
  const baseUrl = getBaseUrl(network)
  const data = await fetchJson<BlockRaw>(`${baseUrl}/block`)

  const result = {
    height: data.header?.height ?? '0',
    hash: data.block_id?.hash ?? null,
    timestamp: data.header?.time ?? null,
  }

  setCache(cacheKey, result)
  return result
}

export async function getInboundAddresses(
  network: ThornodeNetwork = 'thorchain',
): Promise<InboundAddress[]> {
  const cacheKey = `inbound:${network}`
  const cached = getCached<InboundAddress[]>(cacheKey)
  if (cached) {
    console.log(`[Thornode] Returning cached inbound addresses for ${network}`)
    return cached
  }

  console.log(`[Thornode] Fetching inbound addresses for ${network}`)
  const baseUrl = getBaseUrl(network)
  const data = await fetchJson<InboundAddressRaw[]>(`${baseUrl}/inbound_addresses`)

  const result = data.map(addr => ({
    chain: addr.chain,
    address: addr.address,
    router: addr.router ?? null,
    halted: addr.halted,
    globalTradingPaused: addr.global_trading_paused ?? null,
    chainTradingPaused: addr.chain_trading_paused ?? null,
    chainLpActionsPaused: addr.chain_lp_actions_paused ?? null,
    gasRate: addr.gas_rate ?? null,
    gasRateUnits: addr.gas_rate_units ?? null,
    outboundTxSize: addr.outbound_tx_size ?? null,
    outboundFee: addr.outbound_fee ?? null,
    dustThreshold: addr.dust_threshold ?? null,
  }))

  setCache(cacheKey, result)
  return result
}
