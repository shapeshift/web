// ============================================================================
// Hyperliquid Type Definitions
// Based on @nktkas/hyperliquid SDK and Hyperliquid API
// ============================================================================

import type { AssetId } from '@shapeshiftoss/caip'

// ============================================================================
// Enums
// ============================================================================

export enum OrderType {
  Limit = 'Limit',
  Market = 'Market',
}

export enum OrderSide {
  Buy = 'B',
  Sell = 'A',
}

export enum TimeInForce {
  GoodTilCanceled = 'Gtc',
  ImmediateOrCancel = 'Ioc',
  AllOrNone = 'Alo',
}

export enum OrderStatus {
  Open = 'open',
  Filled = 'filled',
  Canceled = 'canceled',
  Rejected = 'rejected',
  PartiallyFilled = 'partiallyFilled',
}

export enum PositionSide {
  Long = 'long',
  Short = 'short',
}

export enum CandleInterval {
  OneMinute = '1m',
  ThreeMinutes = '3m',
  FiveMinutes = '5m',
  FifteenMinutes = '15m',
  ThirtyMinutes = '30m',
  OneHour = '1h',
  TwoHours = '2h',
  FourHours = '4h',
  EightHours = '8h',
  TwelveHours = '12h',
  OneDay = '1d',
  ThreeDays = '3d',
  OneWeek = '1w',
  OneMonth = '1M',
}

// ============================================================================
// Market Metadata Types
// ============================================================================

export type AssetInfo = {
  name: string
  szDecimals: number
  maxLeverage: number
  onlyIsolated: boolean
}

export type UniverseAsset = {
  name: string
  szDecimals: number
  maxLeverage: number
  onlyIsolated?: boolean
}

export type PerpsMeta = {
  universe: UniverseAsset[]
}

export type SpotMeta = {
  universe: {
    name: string
    tokens: number[]
    index: number
    isCanonical: boolean
  }[]
  tokens: {
    name: string
    szDecimals: number
    weiDecimals: number
    index: number
    tokenId: string
    isCanonical: boolean
  }[]
}

export type MetaAndAssetCtxs = [
  PerpsMeta,
  {
    funding: string
    openInterest: string
    prevDayPx: string
    dayNtlVlm: string
    premium: string
    oraclePx: string
    markPx: string
    midPx: string
    impactPxs: [string, string]
  }[],
]

// ============================================================================
// Orderbook Types
// ============================================================================

export type OrderbookLevel = {
  px: string
  sz: string
  n: number
}

export type L2BookData = {
  coin: string
  levels: [OrderbookLevel[], OrderbookLevel[]]
  time: number
}

export type L2BookSnapshot = {
  coin: string
  levels: [OrderbookLevel[], OrderbookLevel[]]
  time: number
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderRequest = {
  a: number
  b: boolean
  p: string
  s: string
  r: boolean
  t: OrderTypeSpec
  c?: string
}

export type OrderTypeSpec =
  | { limit: { tif: TimeInForce } }
  | { trigger: { isMarket: boolean; triggerPx: string; tpsl: 'tp' | 'sl' } }

export type OrderWire = {
  asset: number
  isBuy: boolean
  limitPx: string
  sz: string
  reduceOnly: boolean
  orderType: OrderTypeSpec
  cloid?: string
}

export type OpenOrder = {
  coin: string
  limitPx: string
  oid: number
  side: string
  sz: string
  timestamp: number
  cloid?: string
  origSz?: string
  reduceOnly?: boolean
  orderType?: string
  triggerCondition?: string
  triggerPx?: string
  children?: OpenOrder[]
}

export type OrderResponse = {
  status: 'ok' | 'err'
  response?: {
    type: 'order'
    data: {
      statuses: Array<{
        resting?: { oid: number }
        filled?: { totalSz: string; avgPx: string; oid: number }
        error?: string
      }>
    }
  }
}

export type CancelRequest = {
  a: number
  o: number
}

export type CancelResponse = {
  status: 'ok' | 'err'
  response?: {
    type: 'cancel'
    data: {
      statuses: string[]
    }
  }
}

// ============================================================================
// Position Types
// ============================================================================

export type Position = {
  coin: string
  szi: string
  leverage: {
    type: 'cross' | 'isolated'
    value: number
    rawUsd?: string
  }
  entryPx: string
  positionValue: string
  unrealizedPnl: string
  returnOnEquity: string
  liquidationPx: string | null
  marginUsed: string
  maxTradeSzs: [string, string]
  cumFunding: {
    allTime: string
    sinceOpen: string
    sinceChange: string
  }
}

export type AssetPosition = {
  position: Position
  type: 'oneWay'
}

// ============================================================================
// Account / Clearinghouse Types
// ============================================================================

export type MarginSummary = {
  accountValue: string
  totalNtlPos: string
  totalRawUsd: string
  totalMarginUsed: string
  withdrawable: string
}

export type CrossMarginSummary = {
  accountValue: string
  totalNtlPos: string
  totalRawUsd: string
  totalMarginUsed: string
}

export type ClearinghouseState = {
  marginSummary: MarginSummary
  crossMarginSummary: CrossMarginSummary
  assetPositions: AssetPosition[]
  crossMaintenanceMarginUsed: string
  withdrawable: string
  time: number
}

export type AccountBalance = {
  coin: string
  total: string
  hold: string
  entryNtl?: string
}

export type SpotClearinghouseState = {
  balances: AccountBalance[]
}

// ============================================================================
// Trade / Fill Types
// ============================================================================

export type Fill = {
  coin: string
  px: string
  sz: string
  side: string
  time: number
  startPosition: string
  dir: string
  closedPnl: string
  hash: string
  oid: number
  crossed: boolean
  fee: string
  tid: number
  feeToken?: string
  builderFee?: string
}

export type UserFill = Fill & {
  cloid?: string
  liquidation?: boolean
}

export type Trade = {
  coin: string
  side: string
  px: string
  sz: string
  time: number
  hash: string
  tid: number
}

// ============================================================================
// Candle / OHLCV Types
// ============================================================================

export type Candle = {
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
}

export type CandleSnapshot = {
  coin: string
  interval: CandleInterval
  candles: Candle[]
}

// ============================================================================
// Funding Types
// ============================================================================

export type FundingRate = {
  coin: string
  fundingRate: string
  premium: string
  time: number
}

export type FundingHistory = {
  coin: string
  fundingRate: string
  premium: string
  time: number
}[]

// ============================================================================
// WebSocket Subscription Types
// ============================================================================

export type WsSubscriptionType =
  | 'allMids'
  | 'notification'
  | 'webData2'
  | 'candle'
  | 'l2Book'
  | 'trades'
  | 'orderUpdates'
  | 'userEvents'
  | 'userFills'
  | 'userFundings'
  | 'userNonFundingLedgerUpdates'

export type AllMidsData = {
  mids: Record<string, string>
}

export type WsL2BookData = {
  coin: string
  levels: [OrderbookLevel[], OrderbookLevel[]]
  time: number
}

export type WsTradesData = Trade[]

export type WsCandleData = Candle

export type WsOrderUpdate = {
  order: OpenOrder
  status: string
  statusTimestamp: number
}

export type WsUserFill = UserFill

export type WsFundingData = {
  coin: string
  usdc: string
  szi: string
  fundingRate: string
  time: number
}

export type WsUserEvent =
  | { fill: WsUserFill }
  | { funding: WsFundingData }
  | { liquidation: { lid: number; liquidator: string; liquidatedUser: string } }

// ============================================================================
// Transfer / Deposit Types
// ============================================================================

export type TransferRequest = {
  destination: string
  amount: string
  time: number
}

export type WithdrawRequest = {
  destination: string
  amount: string
  time: number
}

// ============================================================================
// API Response Types
// ============================================================================

export type ApiResponse<T> = {
  status: 'ok' | 'err'
  response?: T
  error?: string
}

// ============================================================================
// Augmented Types (ShapeShift-specific)
// These types add CAIP-19 AssetId for ShapeShift integration
// ============================================================================

export type AugmentedMarket = {
  coin: string
  assetId: AssetId | undefined
  name: string
  szDecimals: number
  maxLeverage: number
  markPx: string
  midPx: string
  oraclePx: string
  funding: string
  openInterest: string
  dayNtlVlm: string
  prevDayPx: string
  priceChange24h: string
  priceChangePercent24h: string
}

export type AugmentedPosition = Position & {
  assetId: AssetId | undefined
  marketName: string
  side: PositionSide
  unrealizedPnlPercent: string
}

export type AugmentedOpenOrder = OpenOrder & {
  assetId: AssetId | undefined
  marketName: string
  orderSide: OrderSide
  status: OrderStatus
}

// ============================================================================
// Parsed Types (for UI components)
// ============================================================================

export type ParsedOrderbookLevel = {
  price: string
  size: string
  total: string
  count: number
  percentage: number
}

export type ParsedOrderbook = {
  bids: ParsedOrderbookLevel[]
  asks: ParsedOrderbookLevel[]
  spread: string
  spreadPercent: string
  midPrice: string
  lastUpdateTime: number
}

export type ParsedCandle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ParsedPosition = {
  coin: string
  side: PositionSide
  size: string
  sizeUsd: string
  entryPrice: string
  markPrice: string
  liquidationPrice: string | null
  leverage: number
  leverageType: 'cross' | 'isolated'
  unrealizedPnl: string
  unrealizedPnlPercent: string
  marginUsed: string
  fundingAccrued: string
}

export type ParsedFill = {
  coin: string
  side: string
  price: string
  size: string
  value: string
  time: number
  fee: string
  pnl: string
  hash: string
}

// ============================================================================
// UI State Types
// ============================================================================

export type OrderFormState = {
  orderType: OrderType
  side: OrderSide
  price: string
  size: string
  leverage: number
  reduceOnly: boolean
  postOnly: boolean
  timeInForce: TimeInForce
  takeProfitPrice: string
  stopLossPrice: string
}

export type MarketSelectorState = {
  searchQuery: string
  selectedCoin: string | null
  sortBy: 'name' | 'volume' | 'price' | 'change'
  sortDirection: 'asc' | 'desc'
}

// ============================================================================
// Error Types
// ============================================================================

export type HyperliquidError = {
  code: string
  message: string
  details?: Record<string, unknown>
}

export enum HyperliquidErrorCode {
  WalletNotInitialized = 'WALLET_NOT_INITIALIZED',
  InsufficientCollateral = 'INSUFFICIENT_COLLATERAL',
  InvalidSignature = 'INVALID_SIGNATURE',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  InvalidOrder = 'INVALID_ORDER',
  OrderNotFound = 'ORDER_NOT_FOUND',
  PositionNotFound = 'POSITION_NOT_FOUND',
  WebSocketDisconnected = 'WEBSOCKET_DISCONNECTED',
  NetworkError = 'NETWORK_ERROR',
}
