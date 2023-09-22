export const RATE_LIMIT_THRESHOLDS_PER_MINUTE = {
  COINGECKO: 500, // https://www.coingecko.com/en/api/documentation - analyst plan
  COINCAP: 200, // https://docs.coincap.io/ limits->free tier
  DEFAULT: 300, // default for services
}

export const DEFAULT_RATE_LIMITER_INTERVAL_IN_MS = 60000
export const DEFAULT_CACHE_TTL_MS = 1000 * 5 // 5 seconds
