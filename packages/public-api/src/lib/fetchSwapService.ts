import type { Response } from 'express'

import type { ErrorResponse } from '../types'

const DEFAULT_TIMEOUT_MS = 10_000

export const fetchSwapService = async (
  res: Response,
  url: string,
  options?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<globalThis.Response | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      res.status(504).json({
        error: 'Swap service request timed out',
        code: 'SERVICE_TIMEOUT',
      } satisfies ErrorResponse)
    } else {
      console.error('Failed to connect to swap-service:', error)
      res.status(503).json({
        error: 'Swap service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      } satisfies ErrorResponse)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}
