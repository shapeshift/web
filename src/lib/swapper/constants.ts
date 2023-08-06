import { makeSwapErrorRight } from './api'

export const QUOTE_TIMEOUT_MS = 10_000

export const QUOTE_TIMEOUT_ERROR = makeSwapErrorRight({
  message: `quote timed out after ${QUOTE_TIMEOUT_MS / 1000}s`,
})
