import axios from 'axios'
import DataLoader from 'dataloader'
import pLimit from 'p-limit'

const PORTALS_BASE_URL = 'https://api.portals.fi'
const PORTALS_REQUEST_LIMIT = pLimit(5)
const PLATFORMS_CACHE_TTL_MS = 5 * 60 * 1000
const BATCH_WINDOW_MS = 50

const CHAIN_ID_TO_PORTALS_NETWORK: Record<string, string> = {
  'eip155:43114': 'avalanche',
  'eip155:1': 'ethereum',
  'eip155:137': 'polygon',
  'eip155:56': 'bsc',
  'eip155:10': 'optimism',
  'eip155:42161': 'arbitrum',
  'eip155:100': 'gnosis',
  'eip155:8453': 'base',
}

export type PortalsToken = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images: string[] | null
  image: string | null
  price: string | null
  pricePerShare: string | null
  platform: string
  network: string
  liquidity: number
  tokens: string[]
  apy: string | null
  volumeUsd1d: string | null
  volumeUsd7d: string | null
}

export type PortalsPlatform = {
  platform: string
  name: string
  image: string
  network: string
}

type PortalsBalancesResponse = {
  balances: {
    key: string
    name: string
    decimals: number
    symbol: string
    address: string
    images?: string[]
    image?: string
    price?: string
    pricePerShare?: string
    platform: string
    network: string
    liquidity: number
    tokens: string[]
    metrics?: {
      apy?: string
      volumeUsd1d?: string
      volumeUsd7d?: string
    }
  }[]
}

type AccountKey = `${string}::${string}`

let platformsCache: PortalsPlatform[] | null = null
let platformsCacheExpiry = 0

function parseAccountKey(key: AccountKey): { chainId: string; address: string } {
  const parts = key.split('::')
  return { chainId: parts[0] ?? '', address: parts[1] ?? '' }
}

function createAccountKey(chainId: string, address: string): AccountKey {
  return `${chainId}::${address}`
}

function createPortalsAccountLoader() {
  return new DataLoader<AccountKey, PortalsToken[]>(
    async (keys: readonly AccountKey[]): Promise<PortalsToken[][]> => {
      console.log(`[Portals] Batching ${keys.length} account lookups`)

      const byNetwork = new Map<string, { key: AccountKey; address: string }[]>()

      for (const key of keys) {
        const { chainId, address } = parseAccountKey(key)
        const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]
        if (!network) continue

        const existing = byNetwork.get(network)
        if (existing) {
          existing.push({ key, address })
        } else {
          byNetwork.set(network, [{ key, address }])
        }
      }

      const results = new Map<AccountKey, PortalsToken[]>()

      await Promise.all(
        [...byNetwork.entries()].map(([network, accounts]) =>
          PORTALS_REQUEST_LIMIT(async () => {
            await Promise.all(
              accounts.map(async ({ key, address }) => {
                try {
                  const { data } = await axios.get<PortalsBalancesResponse>(
                    `${PORTALS_BASE_URL}/v2/account`,
                    {
                      params: { networks: [network], owner: address },
                      timeout: 10000,
                    },
                  )

                  const tokens = data.balances.map(b => ({
                    key: b.key,
                    name: b.name,
                    decimals: b.decimals,
                    symbol: b.symbol,
                    address: b.address,
                    images: b.images ?? null,
                    image: b.image ?? null,
                    price: b.price ?? null,
                    pricePerShare: b.pricePerShare ?? null,
                    platform: b.platform,
                    network: b.network,
                    liquidity: b.liquidity,
                    tokens: b.tokens,
                    apy: b.metrics?.apy ?? null,
                    volumeUsd1d: b.metrics?.volumeUsd1d ?? null,
                    volumeUsd7d: b.metrics?.volumeUsd7d ?? null,
                  }))

                  results.set(key, tokens)
                } catch (error) {
                  console.warn(`[Portals] Failed to fetch account ${address} on ${network}:`, error)
                  results.set(key, [])
                }
              }),
            )
          }),
        ),
      )

      return keys.map(key => results.get(key) ?? [])
    },
    {
      cache: true,
      maxBatchSize: 50,
      batchScheduleFn: callback => setTimeout(callback, BATCH_WINDOW_MS),
    },
  )
}

let accountLoader: DataLoader<AccountKey, PortalsToken[]> | null = null

function getAccountLoader(): DataLoader<AccountKey, PortalsToken[]> {
  if (!accountLoader) {
    accountLoader = createPortalsAccountLoader()
  }
  return accountLoader
}

export function getPortalsAccount(chainId: string, address: string): Promise<PortalsToken[]> {
  const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]
  if (!network) {
    console.log(`[Portals] Chain ${chainId} not supported`)
    return Promise.resolve([])
  }

  return getAccountLoader().load(createAccountKey(chainId, address))
}

export async function getPortalsAccounts(
  requests: { chainId: string; address: string }[],
): Promise<PortalsToken[][]> {
  const keys = requests.map(r => createAccountKey(r.chainId, r.address))
  const results = await getAccountLoader().loadMany(keys)
  return results.map(r => (r instanceof Error ? [] : r))
}

export async function getPortalsPlatforms(): Promise<PortalsPlatform[]> {
  if (platformsCache && Date.now() < platformsCacheExpiry) {
    return platformsCache
  }

  console.log('[Portals] Fetching platforms')

  try {
    const { data } = await axios.get<PortalsPlatform[]>(`${PORTALS_BASE_URL}/v2/platforms`, {
      timeout: 10000,
    })

    platformsCache = data
    platformsCacheExpiry = Date.now() + PLATFORMS_CACHE_TTL_MS

    return data
  } catch (error) {
    console.error('[Portals] Failed to fetch platforms:', error)
    return platformsCache ?? []
  }
}

export function clearPortalsCache(): void {
  if (accountLoader) {
    accountLoader.clearAll()
  }
  platformsCache = null
  platformsCacheExpiry = 0
}
