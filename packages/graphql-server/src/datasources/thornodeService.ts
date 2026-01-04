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
  asset: string
  amount: string
  l1Address: string
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

export type ThornodeBorrower = {
  owner: string
  asset: string
  debtIssued: string
  debtRepaid: string
  debtCurrent: string
  collateralDeposited: string
  collateralWithdrawn: string
  collateralCurrent: string
  lastOpenHeight: number
  lastRepayHeight: number
}

export type ThornodeSaver = {
  asset: string
  assetAddress: string
  lastAddHeight: number | null
  units: string
  assetDepositValue: string
  assetRedeemValue: string
  growthPct: string | null
}

// Raw API response types
type TcyClaimerRaw = {
  asset: string
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

type BorrowerRaw = {
  owner: string
  asset: string
  debt_issued: string
  debt_repaid: string
  debt_current: string
  collateral_deposited: string
  collateral_withdrawn: string
  collateral_current: string
  last_open_height: number
  last_repay_height: number
}

type SaverRaw = {
  asset: string
  asset_address: string
  last_add_height?: number
  units: string
  asset_deposit_value: string
  asset_redeem_value: string
  growth_pct?: string
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

function createTcyClaimsLoader(network: ThornodeNetwork) {
  return new DataLoader<string, TcyClaim[]>(
    async (addresses: readonly string[]): Promise<TcyClaim[][]> => {
      console.log(`[Thornode] Batching ${addresses.length} TCY claim lookups`)
      const baseUrl = getBaseUrl(network)

      const results = await Promise.all(
        addresses.map(address =>
          limit(async (): Promise<TcyClaim[]> => {
            try {
              const response = await fetchJson<{ tcy_claimer: TcyClaimerRaw[] }>(
                `${baseUrl}/tcy_claimer/${address}`,
              )
              return response.tcy_claimer.map(claim => ({
                asset: claim.asset,
                amount: claim.amount,
                l1Address: claim.l1_address,
              }))
            } catch {
              return []
            }
          }),
        ),
      )

      return results
    },
    {
      cache: true,
      maxBatchSize: 50,
      batchScheduleFn: callback => setTimeout(callback, 16),
    },
  )
}

const tcyLoaders = new Map<ThornodeNetwork, DataLoader<string, TcyClaim[]>>()

function getTcyLoader(network: ThornodeNetwork): DataLoader<string, TcyClaim[]> {
  let loader = tcyLoaders.get(network)
  if (!loader) {
    loader = createTcyClaimsLoader(network)
    tcyLoaders.set(network, loader)
  }
  return loader
}

export async function getTcyClaims(
  addresses: string[],
  network: ThornodeNetwork = 'thorchain',
): Promise<TcyClaim[]> {
  const loader = getTcyLoader(network)
  const results = await loader.loadMany(addresses)
  return results.map(result => (result instanceof Error ? [] : result)).flat()
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

type BorrowerLoaderKey = { asset: string; network: ThornodeNetwork }
type SaverLoaderKey = { asset: string; network: ThornodeNetwork }

function createBorrowersLoader() {
  return new DataLoader<BorrowerLoaderKey, ThornodeBorrower[]>(
    async (keys: readonly BorrowerLoaderKey[]): Promise<ThornodeBorrower[][]> => {
      console.log(`[Thornode] Batching ${keys.length} borrower lookups`)

      const results = await Promise.all(
        keys.map(({ asset, network }) =>
          limit(async (): Promise<ThornodeBorrower[]> => {
            const cacheKey = `borrowers:${network}:${asset}`
            const cached = getCached<ThornodeBorrower[]>(cacheKey)
            if (cached) return cached

            const baseUrl = getBaseUrl(network)
            try {
              const data = await fetchJson<BorrowerRaw[]>(`${baseUrl}/pool/${asset}/borrowers`)
              const result = data.map(borrower => ({
                owner: borrower.owner,
                asset: borrower.asset,
                debtIssued: borrower.debt_issued,
                debtRepaid: borrower.debt_repaid,
                debtCurrent: borrower.debt_current,
                collateralDeposited: borrower.collateral_deposited,
                collateralWithdrawn: borrower.collateral_withdrawn,
                collateralCurrent: borrower.collateral_current,
                lastOpenHeight: borrower.last_open_height,
                lastRepayHeight: borrower.last_repay_height,
              }))
              setCache(cacheKey, result)
              return result
            } catch {
              return []
            }
          }),
        ),
      )

      return results
    },
    {
      cache: true,
      maxBatchSize: 20,
      batchScheduleFn: callback => setTimeout(callback, 16),
    },
  )
}

function createSaversLoader() {
  return new DataLoader<SaverLoaderKey, ThornodeSaver[]>(
    async (keys: readonly SaverLoaderKey[]): Promise<ThornodeSaver[][]> => {
      console.log(`[Thornode] Batching ${keys.length} saver lookups`)

      const results = await Promise.all(
        keys.map(({ asset, network }) =>
          limit(async (): Promise<ThornodeSaver[]> => {
            const cacheKey = `savers:${network}:${asset}`
            const cached = getCached<ThornodeSaver[]>(cacheKey)
            if (cached) return cached

            const baseUrl = getBaseUrl(network)
            try {
              const data = await fetchJson<SaverRaw[]>(`${baseUrl}/pool/${asset}/savers`)
              const result = data.map(saver => ({
                asset: saver.asset,
                assetAddress: saver.asset_address,
                lastAddHeight: saver.last_add_height ?? null,
                units: saver.units,
                assetDepositValue: saver.asset_deposit_value,
                assetRedeemValue: saver.asset_redeem_value,
                growthPct: saver.growth_pct ?? null,
              }))
              setCache(cacheKey, result)
              return result
            } catch {
              return []
            }
          }),
        ),
      )

      return results
    },
    {
      cache: true,
      maxBatchSize: 20,
      batchScheduleFn: callback => setTimeout(callback, 16),
    },
  )
}

let borrowersLoader: DataLoader<BorrowerLoaderKey, ThornodeBorrower[]> | null = null
let saversLoader: DataLoader<SaverLoaderKey, ThornodeSaver[]> | null = null

function getBorrowersLoader(): DataLoader<BorrowerLoaderKey, ThornodeBorrower[]> {
  if (!borrowersLoader) {
    borrowersLoader = createBorrowersLoader()
  }
  return borrowersLoader
}

function getSaversLoader(): DataLoader<SaverLoaderKey, ThornodeSaver[]> {
  if (!saversLoader) {
    saversLoader = createSaversLoader()
  }
  return saversLoader
}

export async function getPoolBorrowers(
  asset: string,
  network: ThornodeNetwork = 'thorchain',
): Promise<ThornodeBorrower[]> {
  const loader = getBorrowersLoader()
  const result = await loader.load({ asset, network })
  console.log(`[Thornode] Loaded ${result.length} borrowers for ${asset}`)
  return result
}

export async function getPoolSavers(
  asset: string,
  network: ThornodeNetwork = 'thorchain',
): Promise<ThornodeSaver[]> {
  const loader = getSaversLoader()
  const result = await loader.load({ asset, network })
  console.log(`[Thornode] Loaded ${result.length} savers for ${asset}`)
  return result
}

// ============================================================================
// RUNEPOOL ENDPOINTS
// ============================================================================

export type RunepoolInformation = {
  pol: {
    runeDeposited: string
    runeWithdrawn: string
    value: string
    pnl: string
    currentDeposit: string
  }
  providers: {
    units: string
    pendingUnits: string
    pendingRune: string
    value: string
    pnl: string
    currentDeposit: string
  }
  reserve: {
    units: string
    value: string
    pnl: string
    currentDeposit: string
  }
}

type RunepoolInformationRaw = {
  pol: {
    rune_deposited: string
    rune_withdrawn: string
    value: string
    pnl: string
    current_deposit: string
  }
  providers: {
    units: string
    pending_units: string
    pending_rune: string
    value: string
    pnl: string
    current_deposit: string
  }
  reserve: {
    units: string
    value: string
    pnl: string
    current_deposit: string
  }
}

export type RuneProvider = {
  runeAddress: string
  units: string
  value: string
  pnl: string
  depositAmount: string
  withdrawAmount: string
  lastDepositHeight: number
  lastWithdrawHeight: number
}

type RuneProviderRaw = {
  rune_address: string
  units: string
  value: string
  pnl: string
  deposit_amount: string
  withdraw_amount: string
  last_deposit_height: number
  last_withdraw_height: number
}

export async function getRunepoolInformation(
  network: ThornodeNetwork = 'thorchain',
): Promise<RunepoolInformation | null> {
  const cacheKey = `runepool:${network}`
  const cached = getCached<RunepoolInformation>(cacheKey)
  if (cached) {
    console.log(`[Thornode] Returning cached runepool info for ${network}`)
    return cached
  }

  console.log(`[Thornode] Fetching runepool info for ${network}`)
  const baseUrl = getBaseUrl(network)

  try {
    const data = await fetchJson<RunepoolInformationRaw>(`${baseUrl}/runepool`)
    const result: RunepoolInformation = {
      pol: {
        runeDeposited: data.pol.rune_deposited,
        runeWithdrawn: data.pol.rune_withdrawn,
        value: data.pol.value,
        pnl: data.pol.pnl,
        currentDeposit: data.pol.current_deposit,
      },
      providers: {
        units: data.providers.units,
        pendingUnits: data.providers.pending_units,
        pendingRune: data.providers.pending_rune,
        value: data.providers.value,
        pnl: data.providers.pnl,
        currentDeposit: data.providers.current_deposit,
      },
      reserve: {
        units: data.reserve.units,
        value: data.reserve.value,
        pnl: data.reserve.pnl,
        currentDeposit: data.reserve.current_deposit,
      },
    }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`[Thornode] Failed to fetch runepool info:`, error)
    return null
  }
}

export async function getRuneProvider(
  address: string,
  network: ThornodeNetwork = 'thorchain',
): Promise<RuneProvider | null> {
  const cacheKey = `rune_provider:${network}:${address}`
  const cached = getCached<RuneProvider>(cacheKey)
  if (cached) {
    console.log(`[Thornode] Returning cached rune provider for ${address}`)
    return cached
  }

  console.log(`[Thornode] Fetching rune provider for ${address}`)
  const baseUrl = getBaseUrl(network)

  try {
    const data = await fetchJson<RuneProviderRaw>(`${baseUrl}/rune_provider/${address}`)
    const result: RuneProvider = {
      runeAddress: data.rune_address,
      units: data.units,
      value: data.value,
      pnl: data.pnl,
      depositAmount: data.deposit_amount,
      withdrawAmount: data.withdraw_amount,
      lastDepositHeight: data.last_deposit_height,
      lastWithdrawHeight: data.last_withdraw_height,
    }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`[Thornode] Failed to fetch rune provider for ${address}:`, error)
    return null
  }
}
