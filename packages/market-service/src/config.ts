export const RATE_LIMIT_THRESHOLDS_PER_MINUTE = {
  COINGECKO: 50, // https://www.coingecko.com/en/api/documentation
  COINCAP: 200, // https://docs.coincap.io/ limits->free tier
  YEARN: 300 // couldn't find a limit for yearn
}

export const DEFAULT_RATE_LIMITER_INTERVAL_IN_MS = 60000
