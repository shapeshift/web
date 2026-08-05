export const PROXY_TON_CONTRACTS = new Set([
  'EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez',
  'EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S',
])

// Logical time advances ~1e6 per second, and downstream trace legs (dex payouts, excesses) land
// tens of millions of lts after the initiator - this bounds the search only, results are
// filtered by trace_id
export const TRACE_LT_SEARCH_RANGE = 1_000_000_000n
// Legs of a trace land within this window of its initiator (~5 minutes of logical time)
export const TRACE_COMPLETION_LT_SPAN = 300_000_000n
export const TRACE_BATCH_SIZE = 20
// Toncenter free tier allows ~1 req/sec; 429s are retried with Retry-After
export const TON_REQUEST_QUEUE_INTERVAL_MS = 1_100
// Shorter than the 5s status poll interval so each poll still observes fresh chain state
export const PARSE_TX_CACHE_TTL_MS = 4_000
export const TON_HASH_HEX_LENGTH = 64
