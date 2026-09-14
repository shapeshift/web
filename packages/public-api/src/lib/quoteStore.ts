import type { SwapMetadata } from '@shapeshiftoss/swapper'

export type StoredQuote = {
  quoteId: string
  swapperName: string
  sellAssetId: string
  buyAssetId: string
  sellAmountCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  sendAddress: string
  receiveAddress: string
  partnerAddress?: string
  partnerCode?: string
  partnerBps?: string
  shapeshiftBps: string
  affiliateBps: string
  rate: string
  createdAt: number
  quoteDeadline: number
  metadata: SwapMetadata
  // Set only when this quote is payable externally - memo-bound routes get none
  depositAddress?: string
  txHash?: string
}

/**
 * In-memory store of quotes that are not yet registered with swap-service. A quote is deleted
 * the moment registration succeeds - from then on swap-service is the record - so retention only
 * has to cover the gap between the quote deadline and a slow first status call.
 *
 * Automatic sweep of expired entries every 60 seconds.
 * Migration path: swap to Redis with zero code changes (same get/set/delete interface).
 */
export class QuoteStore {
  private store = new Map<string, StoredQuote>()
  private cleanupInterval: ReturnType<typeof setInterval>

  static readonly BIND_GRACE_MS = 60 * 60 * 1000
  static readonly CLEANUP_INTERVAL_MS = 60 * 1000
  static readonly MAX_QUOTES = 10000

  constructor() {
    this.cleanupInterval = setInterval(() => this.sweep(), QuoteStore.CLEANUP_INTERVAL_MS)
  }

  set(quoteId: string, quote: StoredQuote): void {
    if (!this.store.has(quoteId) && this.store.size >= QuoteStore.MAX_QUOTES) {
      this.evictOldest()
    }
    this.store.set(quoteId, quote)
  }

  private static retentionDeadline(quote: StoredQuote): number {
    return quote.quoteDeadline + QuoteStore.BIND_GRACE_MS
  }

  get(quoteId: string): StoredQuote | undefined {
    const quote = this.store.get(quoteId)
    if (!quote) return undefined

    if (Date.now() > QuoteStore.retentionDeadline(quote)) {
      this.store.delete(quoteId)
      return undefined
    }

    return quote
  }

  delete(quoteId: string): void {
    this.store.delete(quoteId)
  }

  size(): number {
    return this.store.size
  }

  private evictOldest(): void {
    let oldestId: string | undefined
    let oldestTime = Infinity
    for (const [id, quote] of this.store) {
      if (quote.createdAt < oldestTime) {
        oldestTime = quote.createdAt
        oldestId = id
      }
    }
    if (oldestId) {
      console.log(`[QuoteStore] Evicting oldest quote ${oldestId} to enforce max size cap`)
      this.store.delete(oldestId)
    }
  }

  private sweep(): void {
    const now = Date.now()
    let swept = 0
    for (const [id, quote] of this.store) {
      if (now > QuoteStore.retentionDeadline(quote)) {
        this.store.delete(id)
        swept++
      }
    }
    if (swept > 0) {
      console.log(`[QuoteStore] Swept ${swept} expired quotes. ${this.store.size} remaining.`)
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

export const quoteStore = new QuoteStore()
