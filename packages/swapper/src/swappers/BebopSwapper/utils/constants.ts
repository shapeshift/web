import { KnownChainIds } from '@shapeshiftoss/types'

export const BEBOP_SUPPORTED_CHAINIDS = Object.freeze([
  KnownChainIds.EthereumMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
])

// Bebop native token address (same as Zrx)
export const BEBOP_NATIVE_ASSET_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Bebop API base URL
export const BEBOP_API_BASE_URL = 'https://api.bebop.xyz'

// Bebop API version
export const BEBOP_API_VERSION = 'v1'

// Minimum trade value in USD (from API testing)
export const BEBOP_MIN_TRADE_VALUE_USD = 0.01

// Default slippage tolerance (matching other swappers)
export const BEBOP_DEFAULT_SLIPPAGE_BPS = 30 // 0.3%

// Quote timeout in milliseconds
export const BEBOP_QUOTE_TIMEOUT_MS = 10000

// Cache TTL for quotes in milliseconds
export const BEBOP_QUOTE_CACHE_TTL_MS = 5000

// Bebop unsupported assets (if any discovered during testing)
export const BEBOP_UNSUPPORTED_ASSETS = Object.freeze([
  // Add any unsupported assets discovered during implementation
])
