import type { NextFunction, Request, Response } from 'express'

import type { ErrorResponse } from '../types'

const WINDOW_MS = 1000
const MAX_REQUESTS_PER_WINDOW = 10
const CLEANUP_INTERVAL_MS = 60 * 1000

type WindowEntry = {
  count: number
  windowStart: number
}

const windows = new Map<string, WindowEntry>()

export const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windows) {
    if (now - entry.windowStart > WINDOW_MS * 10) {
      windows.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

const getKey = (req: Request): string => {
  return req.affiliateInfo?.affiliateAddress ?? req.ip ?? req.socket.remoteAddress ?? 'unknown'
}

export const registerRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const key = getKey(req)
  const now = Date.now()
  const entry = windows.get(key)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    windows.set(key, { count: 1, windowStart: now })
    next()
    return
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
    } as ErrorResponse)
    return
  }

  entry.count++
  next()
}
