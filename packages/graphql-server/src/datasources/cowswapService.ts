import axios from 'axios'

const COWSWAP_BASE_URL = 'https://api.cow.fi'
const POLL_INTERVAL_MS = 15_000

type CowSwapNetwork = 'mainnet' | 'xdai' | 'arbitrum_one' | 'base' | 'sepolia'

const CHAIN_ID_TO_NETWORK: Record<string, CowSwapNetwork> = {
  'eip155:1': 'mainnet',
  'eip155:100': 'xdai',
  'eip155:42161': 'arbitrum_one',
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
  txHash?: string | null
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

type CowSwapTrade = {
  blockNumber: number
  logIndex: number
  orderUid: string
  owner: string
  sellToken: string
  buyToken: string
  sellAmount: string
  sellAmountBeforeFees: string
  buyAmount: string
  txHash: string | null
  executedProtocolFees?: {
    policy: {
      priceImprovement?: {
        factor: number
        maxVolumeFactor: number
        quote: { sellAmount: string; buyAmount: string; fee: string }
      }
      volume?: { factor: number }
      surplus?: { factor: number; maxVolumeFactor: number }
    }
    amount: string
    token: string
  }[]
}

const txHashCache = new Map<string, string>()
const TX_HASH_BATCH_SIZE = 3
const TX_HASH_BATCH_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTradesForOrder(
  orderUid: string,
  network: CowSwapNetwork,
): Promise<string | null> {
  const cacheKey = `${network}:${orderUid}`
  const cached = txHashCache.get(cacheKey)
  if (cached) return cached

  try {
    const { data } = await axios.get<CowSwapTrade[]>(
      `${COWSWAP_BASE_URL}/${network}/api/v1/trades?orderUid=${orderUid}`,
      { timeout: 5000 },
    )
    const txHash = data[0]?.txHash ?? null
    if (txHash) {
      txHashCache.set(cacheKey, txHash)
    }
    return txHash
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      console.warn(`[CowSwap] Rate limited fetching trades for order ${orderUid.slice(0, 20)}...`)
    } else {
      console.warn(`[CowSwap] Failed to fetch trades for order ${orderUid.slice(0, 20)}...:`, error)
    }
    return null
  }
}

async function fetchTxHashesWithRateLimit(
  orders: { uid: string }[],
  network: CowSwapNetwork,
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()

  for (let i = 0; i < orders.length; i += TX_HASH_BATCH_SIZE) {
    const batch = orders.slice(i, i + TX_HASH_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async order => {
        const txHash = await fetchTradesForOrder(order.uid, network)
        return { uid: order.uid, txHash }
      }),
    )
    batchResults.forEach(({ uid, txHash }) => results.set(uid, txHash))

    if (i + TX_HASH_BATCH_SIZE < orders.length) {
      await sleep(TX_HASH_BATCH_DELAY_MS)
    }
  }

  return results
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

    const fulfilledOrders = data.filter(order => order.status === 'fulfilled')
    if (fulfilledOrders.length > 0) {
      const txHashMap = await fetchTxHashesWithRateLimit(fulfilledOrders, network)

      return data.map(order => ({
        ...order,
        txHash: txHashMap.get(order.uid) ?? null,
      }))
    }

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

  console.log(`[CowSwap] Polling ${activeSubscriptions.size} subscription(s)...`)
  const subscriptions = Array.from(activeSubscriptions.values())

  await Promise.all(
    subscriptions.map(async ({ accountId, address, network }) => {
      const newOrders = await fetchOrdersForAccount(address, network)
      const cacheKey = `${network}:${address}`
      const cachedOrders = orderCache.get(cacheKey) ?? []

      console.log(
        `[CowSwap] ${address.slice(0, 8)}... has ${newOrders.length} orders (was ${
          cachedOrders.length
        })`,
      )

      if (hasOrdersChanged(cachedOrders, newOrders)) {
        orderCache.set(cacheKey, newOrders)
        console.log(`[CowSwap] Orders changed for ${accountId}, publishing update`, {
          ordersCount: newOrders.length,
          statuses: newOrders.slice(0, 5).map(o => ({ uid: o.uid.slice(0, 10), status: o.status })),
          topic: ORDERS_UPDATED_TOPIC,
        })

        const update: OrdersUpdate = {
          accountId,
          orders: newOrders,
          timestamp: Date.now(),
        }

        currentPubsub.publish(ORDERS_UPDATED_TOPIC, { cowswapOrdersUpdated: update })
        console.log(`[CowSwap] Published to topic ${ORDERS_UPDATED_TOPIC}`)
      } else {
        console.log(`[CowSwap] No changes for ${accountId}, skipping publish`)
      }
    }),
  )
}

function startPolling(): void {
  if (pollInterval) return
  console.log(`[CowSwap] Starting order polling (${POLL_INTERVAL_MS / 1000}s interval)`)
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
  console.log(`[CowSwap] subscribeToOrders called:`, {
    accountId,
    chainId,
    address: address.slice(0, 10) + '...',
  })

  const network = CHAIN_ID_TO_NETWORK[chainId]
  if (!network) {
    console.log(`[CowSwap] Chain ${chainId} not supported for orders`)
    return false
  }

  const key = `${chainId}:${address}`
  const isNew = !activeSubscriptions.has(key)

  console.log(`[CowSwap] Subscription status:`, {
    network,
    isNew,
    activeSubscriptionsCount: activeSubscriptions.size,
  })

  if (isNew) {
    activeSubscriptions.set(key, { accountId, chainId, address, network })
    console.log(`[CowSwap] Added new subscription for ${accountId}`)
  }

  if (activeSubscriptions.size === 1) {
    startPolling()
  }

  if (isNew && pubsub) {
    setTimeout(async () => {
      console.log(`[CowSwap] Fetching initial orders for ${accountId}`)
      const orders = await fetchOrdersForAccount(address, network)
      const cacheKey = `${network}:${address}`
      orderCache.set(cacheKey, orders)

      const update: OrdersUpdate = {
        accountId,
        orders,
        timestamp: Date.now(),
      }
      console.log(`[CowSwap] Publishing initial orders:`, {
        accountId,
        ordersCount: orders.length,
        topic: ORDERS_UPDATED_TOPIC,
        statuses: orders.slice(0, 5).map(o => ({ uid: o.uid.slice(0, 10), status: o.status })),
      })
      try {
        await pubsub?.publish(ORDERS_UPDATED_TOPIC, { cowswapOrdersUpdated: update })
        console.log(`[CowSwap] Initial orders published successfully for ${accountId}`)
      } catch (err) {
        console.error(`[CowSwap] Initial orders publish failed for ${accountId}:`, err)
      }
    }, 500)
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
