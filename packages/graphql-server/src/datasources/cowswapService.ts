import axios from 'axios'

const COWSWAP_BASE_URL = 'https://api.cow.fi'
const POLL_INTERVAL_MS = 15_000

type CowSwapNetwork = 'mainnet' | 'gnosis' | 'arbitrum' | 'base' | 'sepolia'

const CHAIN_ID_TO_NETWORK: Record<string, CowSwapNetwork> = {
  'eip155:1': 'mainnet',
  'eip155:100': 'gnosis',
  'eip155:42161': 'arbitrum',
  'eip155:8453': 'base',
  'eip155:11155111': 'sepolia',
}

export type CowSwapOrder = {
  uid: string
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: string
  feeAmount: string
  kind: string
  partiallyFillable: boolean
  sellTokenBalance: string
  buyTokenBalance: string
  signingScheme: string
  signature: string
  from: string
  receiver: string
  owner: string
  creationDate: string
  status: string
  executedSellAmount: string | null
  executedBuyAmount: string | null
  executedSellAmountBeforeFees: string | null
  executedFeeAmount: string | null
  invalidated: boolean
  fullAppData: string | null
  class: string
}

export type OrdersUpdate = {
  accountId: string
  orders: CowSwapOrder[]
  timestamp: number
}

type AccountSubscription = {
  accountId: string
  chainId: string
  address: string
  network: CowSwapNetwork
}

type PubSubLike = {
  publish: (topic: string, payload: unknown) => void
}

const activeSubscriptions = new Map<string, AccountSubscription>()
const orderCache = new Map<string, CowSwapOrder[]>()
let pollInterval: NodeJS.Timeout | null = null
let pubsub: PubSubLike | null = null

export const ORDERS_UPDATED_TOPIC = 'COWSWAP_ORDERS_UPDATED'

export function initCowSwapService(ps: PubSubLike): void {
  pubsub = ps
}

async function fetchOrdersForAccount(
  address: string,
  network: CowSwapNetwork,
): Promise<CowSwapOrder[]> {
  try {
    const { data } = await axios.get<CowSwapOrder[]>(
      `${COWSWAP_BASE_URL}/${network}/api/v1/account/${address}/orders?limit=1000`,
      { timeout: 10000 },
    )
    return data
  } catch (error) {
    console.warn(`[CowSwap] Failed to fetch orders for ${address} on ${network}:`, error)
    return []
  }
}

function hasOrdersChanged(oldOrders: CowSwapOrder[], newOrders: CowSwapOrder[]): boolean {
  if (oldOrders.length !== newOrders.length) return true

  const oldMap = new Map(oldOrders.map(o => [o.uid, o.status]))
  for (const order of newOrders) {
    const oldStatus = oldMap.get(order.uid)
    if (oldStatus === undefined || oldStatus !== order.status) return true
  }

  return false
}

async function pollOrders(): Promise<void> {
  const currentPubsub = pubsub
  if (!currentPubsub || activeSubscriptions.size === 0) return

  const subscriptions = Array.from(activeSubscriptions.values())

  await Promise.all(
    subscriptions.map(async ({ accountId, address, network }) => {
      const newOrders = await fetchOrdersForAccount(address, network)
      const cacheKey = `${network}:${address}`
      const cachedOrders = orderCache.get(cacheKey) ?? []

      if (hasOrdersChanged(cachedOrders, newOrders)) {
        orderCache.set(cacheKey, newOrders)
        console.log(`[CowSwap] Orders changed for ${accountId}, publishing update`)

        const update: OrdersUpdate = {
          accountId,
          orders: newOrders,
          timestamp: Date.now(),
        }

        currentPubsub.publish(ORDERS_UPDATED_TOPIC, { limitOrdersUpdated: update })
      }
    }),
  )
}

function startPolling(): void {
  if (pollInterval) return
  console.log('[CowSwap] Starting order polling')
  pollInterval = setInterval(pollOrders, POLL_INTERVAL_MS)
  pollOrders()
}

function stopPolling(): void {
  if (pollInterval) {
    console.log('[CowSwap] Stopping order polling')
    clearInterval(pollInterval)
    pollInterval = null
  }
}

export function subscribeToOrders(accountId: string, chainId: string, address: string): boolean {
  const network = CHAIN_ID_TO_NETWORK[chainId]
  if (!network) {
    console.log(`[CowSwap] Chain ${chainId} not supported for orders`)
    return false
  }

  const key = `${chainId}:${address}`
  if (!activeSubscriptions.has(key)) {
    activeSubscriptions.set(key, { accountId, chainId, address, network })
    console.log(`[CowSwap] Subscribed to orders for ${accountId}`)
  }

  if (activeSubscriptions.size === 1) {
    startPolling()
  }

  return true
}

export function unsubscribeFromOrders(chainId: string, address: string): void {
  const key = `${chainId}:${address}`
  const network = CHAIN_ID_TO_NETWORK[chainId]
  activeSubscriptions.delete(key)
  if (network) {
    orderCache.delete(`${network}:${address}`)
  }

  console.log(`[CowSwap] Unsubscribed from orders for ${address}`)

  if (activeSubscriptions.size === 0) {
    stopPolling()
  }
}

function parseAccountId(accountId: string): { chainId: string; address: string } | null {
  const parts = accountId.split(':')
  if (parts.length < 3) return null
  const chainId = `${parts[0]}:${parts[1]}`
  const address = parts[2]
  return { chainId, address: address ?? '' }
}

export async function getOrders(accountIds: string[]): Promise<OrdersUpdate[]> {
  const results: OrdersUpdate[] = []

  for (const accountId of accountIds) {
    const parsed = parseAccountId(accountId)
    if (!parsed) continue

    const { chainId, address } = parsed
    const network = CHAIN_ID_TO_NETWORK[chainId]
    if (!network) continue

    const orders = await fetchOrdersForAccount(address, network)

    results.push({
      accountId,
      orders,
      timestamp: Date.now(),
    })
  }

  return results
}
