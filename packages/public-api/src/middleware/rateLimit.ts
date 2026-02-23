import type { Options } from 'express-rate-limit'
import rateLimit from 'express-rate-limit'

const WINDOW_MS = 60 * 1000

const parseEnvInt = (key: string, defaultValue: number): number => {
  const value = process.env[key]
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

const rateLimitHandler: Options['handler'] = (_req, res) => {
  res.status(429).json({
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  })
}

const createLimiter = (envKey: string, defaultMax: number) =>
  rateLimit({
    windowMs: WINDOW_MS,
    max: parseEnvInt(envKey, defaultMax),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
  })

export const globalLimiter = createLimiter('RATE_LIMIT_GLOBAL_MAX', 300)
export const dataLimiter = createLimiter('RATE_LIMIT_DATA_MAX', 120)
export const swapRatesLimiter = createLimiter('RATE_LIMIT_SWAP_RATES_MAX', 60)
export const swapQuoteLimiter = createLimiter('RATE_LIMIT_SWAP_QUOTE_MAX', 45)
