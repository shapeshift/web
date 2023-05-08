import { pRateLimit } from 'p-ratelimit'

import { DEFAULT_RATE_LIMITER_INTERVAL_IN_MS } from '../config'

/**
 * Generic rate limiter creator, can be used with any function that returns a promise
 * @param rate
 * @param interval
 * @returns rate limiter function wrappper
 * usage:
 *   const rateLimiter = createRateLimiter()
 *   rateLimiter(() => fn(...args))
 */
export const createRateLimiter = (rate: number, interval = DEFAULT_RATE_LIMITER_INTERVAL_IN_MS) =>
  pRateLimit({
    interval,
    rate,
  })
