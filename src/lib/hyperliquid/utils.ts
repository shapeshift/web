// ============================================================================
// Hyperliquid Utility Functions
// Formatting, parsing, and helper utilities for Hyperliquid integration
// ============================================================================

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'

import {
  HYPERLIQUID_COLLATERAL_DECIMALS,
  HYPERLIQUID_DEFAULT_ORDERBOOK_LEVELS,
} from './constants'
import {
  type AugmentedMarket,
  type Candle,
  type ClearinghouseState,
  type Fill,
  type L2BookData,
  type MetaAndAssetCtxs,
  type OpenOrder,
  OrderSide,
  type OrderTypeSpec,
  type ParsedCandle,
  type ParsedFill,
  type ParsedOrderbook,
  type ParsedOrderbookLevel,
  type ParsedPosition,
  type PerpsMeta,
  type Position,
  PositionSide,
  TimeInForce,
  type UniverseAsset,
} from './types'

// ============================================================================
// Price Formatting
// ============================================================================

export const formatPrice = (price: string | number, decimals: number = 2): string => {
  const value = bnOrZero(price)
  if (value.isZero()) return '0.00'
  return value.toFixed(decimals)
}

export const formatPriceWithCommas = (price: string | number, decimals: number = 2): string => {
  const value = bnOrZero(price)
  if (value.isZero()) return '0.00'
  return value.toFormat(decimals)
}

export const formatSignificantFigures = (
  value: string | number,
  sigFigs: number = 5,
): string => {
  const num = bnOrZero(value)
  if (num.isZero()) return '0'
  return num.precision(sigFigs).toString()
}

// ============================================================================
// Size Formatting
// ============================================================================

export const formatSize = (size: string | number, szDecimals: number = 4): string => {
  const value = bnOrZero(size)
  if (value.isZero()) return '0'
  return value.toFixed(szDecimals)
}

export const formatSizeWithCommas = (size: string | number, szDecimals: number = 4): string => {
  const value = bnOrZero(size)
  if (value.isZero()) return '0'
  return value.toFormat(szDecimals)
}

export const formatUsdValue = (value: string | number, decimals: number = 2): string => {
  const num = bnOrZero(value)
  if (num.isZero()) return '$0.00'
  const formatted = num.abs().toFormat(decimals)
  return num.isNegative() ? `-$${formatted}` : `$${formatted}`
}

// ============================================================================
// Percentage Formatting
// ============================================================================

export const formatPercent = (value: string | number, decimals: number = 2): string => {
  const num = bnOrZero(value)
  const percentValue = num.times(100)
  const formatted = percentValue.abs().toFixed(decimals)
  const sign = percentValue.isNegative() ? '-' : percentValue.isPositive() ? '+' : ''
  return `${sign}${formatted}%`
}

export const formatFundingRate = (rate: string | number): string => {
  const value = bnOrZero(rate).times(100)
  const formatted = value.abs().toFixed(4)
  const sign = value.isNegative() ? '-' : '+'
  return `${sign}${formatted}%`
}

// ============================================================================
// Leverage Formatting
// ============================================================================

export const formatLeverage = (leverage: number): string => {
  return `${leverage}x`
}

export const parseLeverageInput = (input: string): number | null => {
  const cleaned = input.replace(/x$/i, '').trim()
  const value = parseInt(cleaned, 10)
  return isNaN(value) || value < 1 ? null : value
}

// ============================================================================
// Order Building Utilities
// ============================================================================

export const buildLimitOrderType = (tif: TimeInForce = TimeInForce.GoodTilCanceled): OrderTypeSpec => ({
  limit: { tif },
})

export const buildTriggerOrderType = (params: {
  isMarket: boolean
  triggerPx: string
  tpsl: 'tp' | 'sl'
}): OrderTypeSpec => ({
  trigger: params,
})

export const buildOrderRequest = (params: {
  assetIndex: number
  isBuy: boolean
  price: string
  size: string
  reduceOnly?: boolean
  orderType?: OrderTypeSpec
  cloid?: string
}): {
  a: number
  b: boolean
  p: string
  s: string
  r: boolean
  t: OrderTypeSpec
  c?: string
} => {
  const { assetIndex, isBuy, price, size, reduceOnly = false, orderType, cloid } = params

  return {
    a: assetIndex,
    b: isBuy,
    p: price,
    s: size,
    r: reduceOnly,
    t: orderType ?? buildLimitOrderType(),
    ...(cloid ? { c: cloid } : {}),
  }
}

export const buildCancelRequest = (assetIndex: number, orderId: number): { a: number; o: number } => ({
  a: assetIndex,
  o: orderId,
})

// ============================================================================
// Orderbook Parsing
// ============================================================================

export const parseOrderbook = (
  data: L2BookData,
  maxLevels: number = HYPERLIQUID_DEFAULT_ORDERBOOK_LEVELS,
): ParsedOrderbook => {
  const [bids, asks] = data.levels

  const bidTotal = bids.slice(0, maxLevels).reduce((acc, level) => acc.plus(level.sz), bn(0))
  const askTotal = asks.slice(0, maxLevels).reduce((acc, level) => acc.plus(level.sz), bn(0))
  const maxTotal = bn.max(bidTotal, askTotal)

  const parseBidLevel = (level: { px: string; sz: string; n: number }, runningTotal: string): ParsedOrderbookLevel => ({
    price: level.px,
    size: level.sz,
    total: runningTotal,
    count: level.n,
    percentage: maxTotal.isZero() ? 0 : bnOrZero(runningTotal).div(maxTotal).times(100).toNumber(),
  })

  const parseAskLevel = (level: { px: string; sz: string; n: number }, runningTotal: string): ParsedOrderbookLevel => ({
    price: level.px,
    size: level.sz,
    total: runningTotal,
    count: level.n,
    percentage: maxTotal.isZero() ? 0 : bnOrZero(runningTotal).div(maxTotal).times(100).toNumber(),
  })

  let bidRunning = bn(0)
  const parsedBids = bids.slice(0, maxLevels).map(level => {
    bidRunning = bidRunning.plus(level.sz)
    return parseBidLevel(level, bidRunning.toString())
  })

  let askRunning = bn(0)
  const parsedAsks = asks.slice(0, maxLevels).map(level => {
    askRunning = askRunning.plus(level.sz)
    return parseAskLevel(level, askRunning.toString())
  })

  const bestBid = bids[0]?.px ?? '0'
  const bestAsk = asks[0]?.px ?? '0'
  const spread = bnOrZero(bestAsk).minus(bestBid).toString()
  const midPrice = bnOrZero(bestBid).plus(bestAsk).div(2).toString()
  const spreadPercent = bnOrZero(midPrice).isZero()
    ? '0'
    : bnOrZero(spread).div(midPrice).times(100).toString()

  return {
    bids: parsedBids,
    asks: parsedAsks,
    spread,
    spreadPercent,
    midPrice,
    lastUpdateTime: data.time,
  }
}

export const getOrderbookMidPrice = (data: L2BookData): string => {
  const [bids, asks] = data.levels
  const bestBid = bids[0]?.px ?? '0'
  const bestAsk = asks[0]?.px ?? '0'
  return bnOrZero(bestBid).plus(bestAsk).div(2).toString()
}

export const getOrderbookSpread = (data: L2BookData): { spread: string; spreadPercent: string } => {
  const [bids, asks] = data.levels
  const bestBid = bids[0]?.px ?? '0'
  const bestAsk = asks[0]?.px ?? '0'
  const spread = bnOrZero(bestAsk).minus(bestBid).toString()
  const midPrice = bnOrZero(bestBid).plus(bestAsk).div(2).toString()
  const spreadPercent = bnOrZero(midPrice).isZero()
    ? '0'
    : bnOrZero(spread).div(midPrice).times(100).toString()
  return { spread, spreadPercent }
}

// ============================================================================
// Position Parsing
// ============================================================================

export const parsePosition = (position: Position, markPrice: string): ParsedPosition => {
  const szi = bnOrZero(position.szi)
  const side = szi.isPositive() ? PositionSide.Long : PositionSide.Short
  const size = szi.abs().toString()
  const sizeUsd = szi.abs().times(markPrice).toString()
  const unrealizedPnlPercent = bnOrZero(position.returnOnEquity).toString()

  return {
    coin: position.coin,
    side,
    size,
    sizeUsd,
    entryPrice: position.entryPx,
    markPrice,
    liquidationPrice: position.liquidationPx,
    leverage: position.leverage.value,
    leverageType: position.leverage.type,
    unrealizedPnl: position.unrealizedPnl,
    unrealizedPnlPercent,
    marginUsed: position.marginUsed,
    fundingAccrued: position.cumFunding.sinceOpen,
  }
}

export const getPositionSide = (szi: string): PositionSide => {
  return bnOrZero(szi).isPositive() ? PositionSide.Long : PositionSide.Short
}

export const calculateUnrealizedPnl = (
  entryPrice: string,
  markPrice: string,
  size: string,
  isLong: boolean,
): string => {
  const entry = bnOrZero(entryPrice)
  const mark = bnOrZero(markPrice)
  const sz = bnOrZero(size).abs()

  const priceDiff = isLong ? mark.minus(entry) : entry.minus(mark)
  return priceDiff.times(sz).toString()
}

export const calculateLiquidationPrice = (
  entryPrice: string,
  leverage: number,
  isLong: boolean,
  maintenanceMarginRate: number = 0.03,
): string | null => {
  const entry = bnOrZero(entryPrice)
  if (entry.isZero() || leverage <= 0) return null

  const marginRatio = bn(1).div(leverage)
  const adjustedMargin = marginRatio.minus(maintenanceMarginRate)

  if (isLong) {
    return entry.times(bn(1).minus(adjustedMargin)).toString()
  }
  return entry.times(bn(1).plus(adjustedMargin)).toString()
}

// ============================================================================
// Candle Parsing
// ============================================================================

export const parseCandle = (candle: Candle): ParsedCandle => ({
  time: candle.t,
  open: parseFloat(candle.o),
  high: parseFloat(candle.h),
  low: parseFloat(candle.l),
  close: parseFloat(candle.c),
  volume: parseFloat(candle.v),
})

export const parseCandles = (candles: Candle[]): ParsedCandle[] => {
  return candles.map(parseCandle).sort((a, b) => a.time - b.time)
}

export const candleToLightweightChart = (candle: ParsedCandle): {
  time: number
  open: number
  high: number
  low: number
  close: number
} => ({
  time: Math.floor(candle.time / 1000),
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
})

export const candlesToLightweightChart = (candles: ParsedCandle[]): {
  time: number
  open: number
  high: number
  low: number
  close: number
}[] => candles.map(candleToLightweightChart)

// ============================================================================
// Fill Parsing
// ============================================================================

export const parseFill = (fill: Fill, markPrice?: string): ParsedFill => {
  const price = bnOrZero(fill.px)
  const size = bnOrZero(fill.sz)
  const value = price.times(size).toString()

  return {
    coin: fill.coin,
    side: fill.side,
    price: fill.px,
    size: fill.sz,
    value,
    time: fill.time,
    fee: fill.fee,
    pnl: fill.closedPnl,
    hash: fill.hash,
  }
}

export const parseFills = (fills: Fill[]): ParsedFill[] => {
  return fills.map(fill => parseFill(fill)).sort((a, b) => b.time - a.time)
}

// ============================================================================
// Market Utilities
// ============================================================================

export const parseMetaToMarkets = (metaAndCtxs: MetaAndAssetCtxs): AugmentedMarket[] => {
  const [meta, assetCtxs] = metaAndCtxs

  return meta.universe.map((asset, index) => {
    const ctx = assetCtxs[index]
    const prevDayPx = bnOrZero(ctx?.prevDayPx)
    const markPx = bnOrZero(ctx?.markPx)
    const priceChange24h = markPx.minus(prevDayPx).toString()
    const priceChangePercent24h = prevDayPx.isZero()
      ? '0'
      : markPx.minus(prevDayPx).div(prevDayPx).toString()

    return {
      coin: asset.name,
      assetId: undefined,
      name: asset.name,
      szDecimals: asset.szDecimals,
      maxLeverage: asset.maxLeverage,
      markPx: ctx?.markPx ?? '0',
      midPx: ctx?.midPx ?? '0',
      oraclePx: ctx?.oraclePx ?? '0',
      funding: ctx?.funding ?? '0',
      openInterest: ctx?.openInterest ?? '0',
      dayNtlVlm: ctx?.dayNtlVlm ?? '0',
      prevDayPx: ctx?.prevDayPx ?? '0',
      priceChange24h,
      priceChangePercent24h,
    }
  })
}

export const searchMarkets = (markets: AugmentedMarket[], query: string): AugmentedMarket[] => {
  if (!query) return markets
  const search = query.toLowerCase().trim()
  return markets.filter(
    market =>
      market.coin.toLowerCase().includes(search) ||
      market.name.toLowerCase().includes(search),
  )
}

export const sortMarketsByVolume = (markets: AugmentedMarket[]): AugmentedMarket[] => {
  return [...markets].sort((a, b) =>
    bnOrZero(b.dayNtlVlm).minus(bnOrZero(a.dayNtlVlm)).toNumber(),
  )
}

export const sortMarketsByPriceChange = (markets: AugmentedMarket[]): AugmentedMarket[] => {
  return [...markets].sort((a, b) =>
    bnOrZero(b.priceChangePercent24h).abs().minus(bnOrZero(a.priceChangePercent24h).abs()).toNumber(),
  )
}

export const sortMarketsByName = (markets: AugmentedMarket[]): AugmentedMarket[] => {
  return [...markets].sort((a, b) => a.coin.localeCompare(b.coin))
}

export const getAssetIndexFromMeta = (meta: PerpsMeta, coin: string): number => {
  const index = meta.universe.findIndex(asset => asset.name === coin)
  if (index === -1) {
    throw new Error(`Asset ${coin} not found in universe`)
  }
  return index
}

export const getAssetFromMeta = (meta: PerpsMeta, coin: string): UniverseAsset | undefined => {
  return meta.universe.find(asset => asset.name === coin)
}

// ============================================================================
// Order Utilities
// ============================================================================

export const searchOrders = (orders: OpenOrder[], query: string): OpenOrder[] => {
  if (!query) return orders
  const search = query.toLowerCase().trim()
  return orders.filter(
    order =>
      order.coin.toLowerCase().includes(search) ||
      order.oid.toString().includes(search),
  )
}

export const getOrderSide = (side: string): OrderSide => {
  return side.toLowerCase() === 'b' || side.toLowerCase() === 'buy'
    ? OrderSide.Buy
    : OrderSide.Sell
}

export const getOrderSideLabel = (side: OrderSide | string): string => {
  const normalizedSide = typeof side === 'string' ? getOrderSide(side) : side
  return normalizedSide === OrderSide.Buy ? 'Buy' : 'Sell'
}

export const formatOrderType = (orderType?: string): string => {
  if (!orderType) return 'Limit'
  const lower = orderType.toLowerCase()
  if (lower.includes('market')) return 'Market'
  if (lower.includes('limit')) return 'Limit'
  if (lower.includes('trigger')) return 'Trigger'
  return orderType
}

// ============================================================================
// Account Utilities
// ============================================================================

export const getAccountValue = (state: ClearinghouseState): string => {
  return state.marginSummary.accountValue
}

export const getWithdrawable = (state: ClearinghouseState): string => {
  return state.marginSummary.withdrawable
}

export const getTotalMarginUsed = (state: ClearinghouseState): string => {
  return state.marginSummary.totalMarginUsed
}

export const getOpenPositions = (state: ClearinghouseState): Position[] => {
  return state.assetPositions
    .filter(ap => bnOrZero(ap.position.szi).abs().gt(0))
    .map(ap => ap.position)
}

export const hasOpenPositions = (state: ClearinghouseState): boolean => {
  return getOpenPositions(state).length > 0
}

export const calculateTotalUnrealizedPnl = (state: ClearinghouseState): string => {
  return state.assetPositions.reduce((total, ap) => {
    return total.plus(ap.position.unrealizedPnl)
  }, bn(0)).toString()
}

// ============================================================================
// Collateral Utilities
// ============================================================================

export const formatCollateral = (amount: string | number, decimals: number = HYPERLIQUID_COLLATERAL_DECIMALS): string => {
  const value = bnOrZero(amount)
  return value.toFixed(decimals)
}

export const parseCollateralInput = (input: string): string | null => {
  const cleaned = input.replace(/[^0-9.]/g, '')
  const value = bnOrZero(cleaned)
  if (value.isNaN() || value.isNegative()) return null
  return value.toString()
}

export const isInsufficientCollateral = (
  requiredMargin: string,
  availableBalance: string,
): boolean => {
  return bnOrZero(requiredMargin).gt(bnOrZero(availableBalance))
}

export const calculateRequiredMargin = (
  notionalValue: string,
  leverage: number,
): string => {
  if (leverage <= 0) return notionalValue
  return bnOrZero(notionalValue).div(leverage).toString()
}

// ============================================================================
// Validation Utilities
// ============================================================================

export const isValidPrice = (price: string): boolean => {
  const value = bnOrZero(price)
  return !value.isNaN() && value.isPositive()
}

export const isValidSize = (size: string): boolean => {
  const value = bnOrZero(size)
  return !value.isNaN() && value.isPositive()
}

export const isValidLeverage = (leverage: number, maxLeverage: number): boolean => {
  return leverage >= 1 && leverage <= maxLeverage && Number.isInteger(leverage)
}

export const validateOrderParams = (params: {
  price: string
  size: string
  leverage: number
  maxLeverage: number
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!isValidPrice(params.price)) {
    errors.push('Invalid price')
  }
  if (!isValidSize(params.size)) {
    errors.push('Invalid size')
  }
  if (!isValidLeverage(params.leverage, params.maxLeverage)) {
    errors.push(`Leverage must be between 1 and ${params.maxLeverage}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Time Utilities
// ============================================================================

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

export const getTimestampForInterval = (interval: string, periodsBack: number): number => {
  const now = Date.now()
  const intervalMs: Record<string, number> = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  }

  const ms = intervalMs[interval] ?? 60 * 1000
  return now - ms * periodsBack
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

export const parseHyperliquidError = (error: unknown): { code: string; message: string } => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('not initialized') || message.includes('does not exist')) {
      return { code: 'WALLET_NOT_INITIALIZED', message: 'Wallet not initialized on Hyperliquid' }
    }
    if (message.includes('insufficient') || message.includes('margin')) {
      return { code: 'INSUFFICIENT_COLLATERAL', message: 'Insufficient collateral' }
    }
    if (message.includes('signature') || message.includes('invalid sig')) {
      return { code: 'INVALID_SIGNATURE', message: 'Invalid signature' }
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded. Please try again later.' }
    }
    if (message.includes('order')) {
      return { code: 'INVALID_ORDER', message: error.message }
    }

    return { code: 'UNKNOWN_ERROR', message: error.message }
  }

  return { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' }
}

export const isRateLimitError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('rate limit') || error.message.includes('429')
  }
  return false
}

export const isWalletNotInitializedError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('not initialized') || message.includes('does not exist')
  }
  return false
}
