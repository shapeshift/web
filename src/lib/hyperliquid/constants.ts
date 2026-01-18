// ============================================================================
// Hyperliquid Constants and Endpoint Configuration
// API endpoints, chain IDs, and configuration values for Hyperliquid integration
// ============================================================================

// ============================================================================
// API Endpoints
// ============================================================================

export const HYPERLIQUID_MAINNET_REST_URL = 'https://api.hyperliquid.xyz'
export const HYPERLIQUID_MAINNET_WS_URL = 'wss://api.hyperliquid.xyz/ws'
export const HYPERLIQUID_TESTNET_REST_URL = 'https://api.hyperliquid-testnet.xyz'
export const HYPERLIQUID_TESTNET_WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws'

// ============================================================================
// Chain Configuration
// ============================================================================

export const HYPERLIQUID_CHAIN_ID = 1337
export const HYPERLIQUID_ARBITRUM_CHAIN_ID = 42161

// ============================================================================
// Network Types
// ============================================================================

export type HyperliquidNetwork = 'mainnet' | 'testnet'

export const HYPERLIQUID_NETWORKS: HyperliquidNetwork[] = ['mainnet', 'testnet']

// ============================================================================
// URL Helpers
// ============================================================================

export const getHyperliquidRestUrl = (network: HyperliquidNetwork): string =>
  network === 'mainnet' ? HYPERLIQUID_MAINNET_REST_URL : HYPERLIQUID_TESTNET_REST_URL

export const getHyperliquidWsUrl = (network: HyperliquidNetwork): string =>
  network === 'mainnet' ? HYPERLIQUID_MAINNET_WS_URL : HYPERLIQUID_TESTNET_WS_URL

// ============================================================================
// Rate Limiting
// ============================================================================

export const HYPERLIQUID_RATE_LIMIT_MAX_TOKENS = 100
export const HYPERLIQUID_RATE_LIMIT_REFILL_PER_SECOND = 10
export const HYPERLIQUID_RATE_LIMIT_BACKOFF_MS = 1000

// ============================================================================
// WebSocket Configuration
// ============================================================================

export const HYPERLIQUID_WS_RECONNECT_INTERVAL_MS = 3000
export const HYPERLIQUID_WS_MAX_RECONNECT_ATTEMPTS = 10
export const HYPERLIQUID_WS_PING_INTERVAL_MS = 30000
export const HYPERLIQUID_RECONNECT_DELAY_BASE_MS = 1000
export const HYPERLIQUID_RECONNECT_DELAY_MAX_MS = 30000

// ============================================================================
// Polling Configuration
// ============================================================================

export const HYPERLIQUID_POLL_INTERVAL_MS = 5000
export const HYPERLIQUID_MAX_POLL_ATTEMPTS = 120

// ============================================================================
// Orderbook Configuration
// ============================================================================

export const HYPERLIQUID_DEFAULT_ORDERBOOK_LEVELS = 20
export const HYPERLIQUID_MAX_ORDERBOOK_LEVELS = 100
export const HYPERLIQUID_DEFAULT_SIG_FIGS = 5

// ============================================================================
// Trading Configuration
// ============================================================================

export const HYPERLIQUID_DEFAULT_LEVERAGE = 1
export const HYPERLIQUID_MAX_LEVERAGE = 50
export const HYPERLIQUID_MIN_ORDER_SIZE_USD = 10
export const HYPERLIQUID_COLLATERAL_TOKEN = 'USDC'
export const HYPERLIQUID_COLLATERAL_DECIMALS = 6

// ============================================================================
// Candle Intervals
// ============================================================================

export const HYPERLIQUID_CANDLE_INTERVALS = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M',
] as const

export type HyperliquidCandleInterval = (typeof HYPERLIQUID_CANDLE_INTERVALS)[number]

// ============================================================================
// Default Market
// ============================================================================

export const HYPERLIQUID_DEFAULT_MARKET = 'BTC'

// ============================================================================
// Popular Markets (for quick selection)
// ============================================================================

export const HYPERLIQUID_POPULAR_MARKETS = ['BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'AVAX'] as const

// ============================================================================
// Time Constants
// ============================================================================

export const HYPERLIQUID_SIGNATURE_EXPIRY_MS = 60000
export const HYPERLIQUID_ORDER_EXPIRY_MS = 86400000
