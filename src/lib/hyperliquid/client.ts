// ============================================================================
// Hyperliquid Client Wrapper
// Wraps @nktkas/hyperliquid SDK clients for InfoClient and ExchangeClient
// ============================================================================

import {
  ExchangeClient,
  HttpTransport,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from '@nktkas/hyperliquid'
import type { WalletClient } from 'viem'

import type {
  CancelRequest,
  CancelResponse,
  CandleInterval,
  ClearinghouseState,
  Fill,
  L2BookData,
  MetaAndAssetCtxs,
  OpenOrder,
  OrderRequest,
  OrderResponse,
  PerpsMeta,
  SpotClearinghouseState,
  SpotMeta,
} from './types'

// ============================================================================
// Configuration
// ============================================================================

const MAINNET_REST_URL = 'https://api.hyperliquid.xyz'
const MAINNET_WS_URL = 'wss://api.hyperliquid.xyz/ws'
const TESTNET_REST_URL = 'https://api.hyperliquid-testnet.xyz'
const TESTNET_WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws'

type NetworkType = 'mainnet' | 'testnet'

type HyperliquidClientConfig = {
  network?: NetworkType
  wallet?: WalletClient
}

// ============================================================================
// Singleton Clients
// ============================================================================

let infoClientInstance: InfoClient | null = null
let exchangeClientInstance: ExchangeClient | null = null
let subscriptionClientInstance: SubscriptionClient | null = null
let currentNetwork: NetworkType = 'mainnet'
let currentWallet: WalletClient | null = null

const getRestUrl = (network: NetworkType): string =>
  network === 'mainnet' ? MAINNET_REST_URL : TESTNET_REST_URL

const getWsUrl = (network: NetworkType): string =>
  network === 'mainnet' ? MAINNET_WS_URL : TESTNET_WS_URL

// ============================================================================
// Client Initialization
// ============================================================================

export const initializeClients = (config: HyperliquidClientConfig = {}): void => {
  const { network = 'mainnet', wallet } = config

  const networkChanged = network !== currentNetwork
  const walletChanged = wallet !== currentWallet

  if (networkChanged || !infoClientInstance) {
    infoClientInstance = new InfoClient({
      transport: new HttpTransport({ url: getRestUrl(network) }),
    })
  }

  if ((networkChanged || walletChanged || !exchangeClientInstance) && wallet) {
    exchangeClientInstance = new ExchangeClient({
      transport: new HttpTransport({ url: getRestUrl(network) }),
      wallet,
    })
  }

  if (networkChanged || !subscriptionClientInstance) {
    subscriptionClientInstance = new SubscriptionClient({
      transport: new WebSocketTransport({ url: getWsUrl(network) }),
    })
  }

  currentNetwork = network
  currentWallet = wallet ?? null
}

export const getInfoClient = (): InfoClient => {
  if (!infoClientInstance) {
    initializeClients()
  }
  if (!infoClientInstance) {
    throw new Error('Failed to initialize InfoClient')
  }
  return infoClientInstance
}

export const getExchangeClient = (): ExchangeClient | null => {
  return exchangeClientInstance
}

export const getSubscriptionClient = (): SubscriptionClient => {
  if (!subscriptionClientInstance) {
    initializeClients()
  }
  if (!subscriptionClientInstance) {
    throw new Error('Failed to initialize SubscriptionClient')
  }
  return subscriptionClientInstance
}

export const setWallet = (wallet: WalletClient): void => {
  initializeClients({ network: currentNetwork, wallet })
}

export const clearWallet = (): void => {
  exchangeClientInstance = null
  currentWallet = null
}

export const getCurrentNetwork = (): NetworkType => currentNetwork

// ============================================================================
// Info Client Methods (Read Operations)
// ============================================================================

export const fetchMeta = async (): Promise<PerpsMeta> => {
  const client = getInfoClient()
  const response = await client.meta()
  return response as PerpsMeta
}

export const fetchMetaAndAssetCtxs = async (): Promise<MetaAndAssetCtxs> => {
  const client = getInfoClient()
  const response = await client.metaAndAssetCtxs()
  return response as MetaAndAssetCtxs
}

export const fetchSpotMeta = async (): Promise<SpotMeta> => {
  const client = getInfoClient()
  const response = await client.spotMeta()
  return response as SpotMeta
}

export const fetchAllMids = async (): Promise<Record<string, string>> => {
  const client = getInfoClient()
  const response = await client.allMids()
  return response as Record<string, string>
}

export const fetchL2Book = async (params: {
  coin: string
  nSigFigs?: number
  mantissa?: number
}): Promise<L2BookData> => {
  const client = getInfoClient()
  const response = await client.l2Book(params)
  return response as L2BookData
}

export const fetchClearinghouseState = async (params: {
  user: string
}): Promise<ClearinghouseState> => {
  const client = getInfoClient()
  const response = await client.clearinghouseState(params)
  return response as ClearinghouseState
}

export const fetchSpotClearinghouseState = async (params: {
  user: string
}): Promise<SpotClearinghouseState> => {
  const client = getInfoClient()
  const response = await client.spotClearinghouseState(params)
  return response as SpotClearinghouseState
}

export const fetchOpenOrders = async (params: { user: string }): Promise<OpenOrder[]> => {
  const client = getInfoClient()
  const response = await client.openOrders(params)
  return response as OpenOrder[]
}

export const fetchFrontendOpenOrders = async (params: { user: string }): Promise<OpenOrder[]> => {
  const client = getInfoClient()
  const response = await client.frontendOpenOrders(params)
  return response as OpenOrder[]
}

export const fetchUserFills = async (params: { user: string }): Promise<Fill[]> => {
  const client = getInfoClient()
  const response = await client.userFills(params)
  return response as Fill[]
}

export const fetchUserFillsByTime = async (params: {
  user: string
  startTime: number
  endTime?: number
}): Promise<Fill[]> => {
  const client = getInfoClient()
  const response = await client.userFillsByTime(params)
  return response as Fill[]
}

export const fetchFundingHistory = async (params: {
  user: string
  startTime: number
  endTime?: number
}): Promise<
  {
    time: number
    coin: string
    usdc: string
    szi: string
    fundingRate: string
  }[]
> => {
  const client = getInfoClient()
  const response = await client.userFunding(params)
  return response as {
    time: number
    coin: string
    usdc: string
    szi: string
    fundingRate: string
  }[]
}

export const fetchCandleSnapshot = async (params: {
  coin: string
  interval: CandleInterval
  startTime: number
  endTime: number
}): Promise<
  {
    t: number
    T: number
    s: string
    i: string
    o: string
    c: string
    h: string
    l: string
    v: string
    n: number
  }[]
> => {
  const client = getInfoClient()
  const response = await client.candleSnapshot(params)
  return response as {
    t: number
    T: number
    s: string
    i: string
    o: string
    c: string
    h: string
    l: string
    v: string
    n: number
  }[]
}

export const fetchUserRateLimit = async (params: {
  user: string
}): Promise<{
  cumVlm: string
  nRequestsUsed: number
  nRequestsCap: number
}> => {
  const client = getInfoClient()
  const response = await client.userRateLimit(params)
  return response as {
    cumVlm: string
    nRequestsUsed: number
    nRequestsCap: number
  }
}

// ============================================================================
// Exchange Client Methods (Write Operations)
// ============================================================================

export const placeOrder = async (params: {
  orders: OrderRequest[]
  grouping: 'na' | 'normalTpsl' | 'positionTpsl'
}): Promise<OrderResponse> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.order(params)
  return response as OrderResponse
}

export const cancelOrder = async (params: {
  cancels: CancelRequest[]
}): Promise<CancelResponse> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.cancel(params)
  return response as CancelResponse
}

export const cancelOrderByCloid = async (params: {
  cancels: { asset: number; cloid: string }[]
}): Promise<CancelResponse> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.cancelByCloid(params)
  return response as CancelResponse
}

export const modifyOrder = async (params: {
  oid: number
  order: OrderRequest
}): Promise<OrderResponse> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.modify(params)
  return response as OrderResponse
}

export const batchModifyOrders = async (params: {
  modifies: { oid: number; order: OrderRequest }[]
}): Promise<OrderResponse> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.batchModify(params)
  return response as OrderResponse
}

export const updateLeverage = async (params: {
  asset: number
  isCross: boolean
  leverage: number
}): Promise<{ status: string }> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.updateLeverage(params)
  return response as { status: string }
}

export const updateIsolatedMargin = async (params: {
  asset: number
  isBuy: boolean
  ntli: number
}): Promise<{ status: string }> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.updateIsolatedMargin(params)
  return response as { status: string }
}

export const usdClassTransfer = async (params: {
  amount: string
  toPerp: boolean
}): Promise<{ status: string }> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.usdClassTransfer(params)
  return response as { status: string }
}

export const withdraw = async (params: {
  destination: string
  amount: string
}): Promise<{ status: string }> => {
  const client = getExchangeClient()
  if (!client) {
    throw new Error('Exchange client not initialized. Please connect a wallet.')
  }
  const response = await client.withdraw3(params)
  return response as { status: string }
}

// ============================================================================
// Subscription Client Methods (WebSocket)
// ============================================================================

export type UnsubscribeFn = () => void

export const subscribeToAllMids = (
  callback: (data: { mids: Record<string, string> }) => void,
): UnsubscribeFn => {
  const client = getSubscriptionClient()
  client.allMids({}, callback)
  return () => client.unsubscribe({ type: 'allMids' })
}

export const subscribeToL2Book = (
  params: { coin: string; nSigFigs?: number; mantissa?: number },
  callback: (data: L2BookData) => void,
): UnsubscribeFn => {
  const client = getSubscriptionClient()
  client.l2Book(params, callback as (data: unknown) => void)
  return () => client.unsubscribe({ type: 'l2Book', coin: params.coin })
}

export const subscribeToTrades = (
  params: { coin: string },
  callback: (data: { coin: string; side: string; px: string; sz: string; time: number }[]) => void,
): UnsubscribeFn => {
  const client = getSubscriptionClient()
  client.trades(params, callback as (data: unknown) => void)
  return () => client.unsubscribe({ type: 'trades', coin: params.coin })
}

export const subscribeToCandle = (
  params: { coin: string; interval: CandleInterval },
  callback: (data: {
    t: number
    T: number
    s: string
    i: string
    o: string
    c: string
    h: string
    l: string
    v: string
    n: number
  }) => void,
): UnsubscribeFn => {
  const client = getSubscriptionClient()
  client.candle(params, callback as (data: unknown) => void)
  return () => client.unsubscribe({ type: 'candle', coin: params.coin, interval: params.interval })
}

export const subscribeToUserFills = (
  params: { user: string },
  callback: (data: Fill) => void,
): UnsubscribeFn => {
  const client = getSubscriptionClient()
  client.userFills(params, callback as (data: unknown) => void)
  return () => client.unsubscribe({ type: 'userFills', user: params.user })
}

export const subscribeToOrderUpdates = (
  params: { user: string },
  callback: (data: { order: OpenOrder; status: string; statusTimestamp: number }) => void,
): UnsubscribeFn => {
  const client = getSubscriptionClient()
  client.orderUpdates(params, callback as (data: unknown) => void)
  return () => client.unsubscribe({ type: 'orderUpdates', user: params.user })
}

// ============================================================================
// Utility Functions
// ============================================================================

export const getAssetIndex = async (coin: string): Promise<number> => {
  const meta = await fetchMeta()
  const index = meta.universe.findIndex(asset => asset.name === coin)
  if (index === -1) {
    throw new Error(`Asset ${coin} not found in universe`)
  }
  return index
}

export const isWalletConnected = (): boolean => {
  return exchangeClientInstance !== null
}

export const getConnectedWallet = (): WalletClient | null => {
  return currentWallet
}
