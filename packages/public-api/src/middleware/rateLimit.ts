import type { Options, RateLimitRequestHandler } from 'express-rate-limit'
import rateLimit from 'express-rate-limit'

import { env } from '../env'

const WINDOW_MS = 60 * 1000

export enum RateLimitErrorCode {
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
}

const rateLimitHandler: Options['handler'] = (_req, res) => {
  res.status(429).json({
    error: 'Too many requests, please try again later',
    code: RateLimitErrorCode.RateLimitExceeded,
  })
}

const createLimiter = (max: number): RateLimitRequestHandler =>
  rateLimit({
    windowMs: WINDOW_MS,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
  })

export const globalLimiter = createLimiter(env.RATE_LIMIT_GLOBAL_MAX)
export const dataLimiter = createLimiter(env.RATE_LIMIT_DATA_MAX)
export const swapRatesLimiter = createLimiter(env.RATE_LIMIT_SWAP_RATES_MAX)
export const swapQuoteLimiter = createLimiter(env.RATE_LIMIT_SWAP_QUOTE_MAX)
export const swapStatusLimiter = createLimiter(env.RATE_LIMIT_SWAP_STATUS_MAX)
export const affiliateStatsLimiter = createLimiter(env.RATE_LIMIT_AFFILIATE_STATS_MAX)
export const affiliateMutationLimiter = createLimiter(env.RATE_LIMIT_AFFILIATE_MUTATION_MAX)
