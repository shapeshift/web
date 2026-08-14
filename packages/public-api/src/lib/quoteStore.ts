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
  // What the client counts down, returned to it as expiresAt - retention runs past this
  quoteDeadline: number
  metadata: SwapMetadata
  // Set only when this quote is payable externally - memo-bound routes get none
  depositAddress?: string
  txHash?: string
  registeredAt?: number
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
}

/**
 * In-memory quote store with dual TTL:
 * - unsubmitted: quote deadline + bind grace (a slow first confirmation must still bind)
 * - submitted: txHash bind time + execution TTL (destination-chain settlement tracking)
 *
 * Automatic sweep of expired entries every 60 seconds.
 * Migration path: swap to Redis with zero code changes (same get/set/delete interface).
 */
export class QuoteStore {
  private store = new Map<string, StoredQuote>()
  private txHashIndex = new Map<string, string>()
  private cleanupInterval: ReturnType<typeof setInterval>

  static readonly BIND_GRACE_MS = 60 * 60 * 1000
  static readonly EXECUTION_TTL_MS = 60 * 60 * 1000
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
    if (quote.txHash) {
      this.txHashIndex.set(quote.txHash, quoteId)
    }
  }

  // How long status can still answer for a quote, which outlives the quote's own deadline
  private static statusDeadline(quote: StoredQuote): number {
    return quote.txHash
      ? (quote.registeredAt ?? quote.createdAt) + QuoteStore.EXECUTION_TTL_MS
      : quote.quoteDeadline + QuoteStore.BIND_GRACE_MS
  }

  get(quoteId: string): StoredQuote | undefined {
    const quote = this.store.get(quoteId)
    if (!quote) return undefined

    if (Date.now() > QuoteStore.statusDeadline(quote)) {
      this.remove(quoteId, quote)
      return undefined
    }

    return quote
  }

  hasTxHash(txHash: string): boolean {
    const quoteId = this.txHashIndex.get(txHash)
    if (!quoteId) return false
    return this.get(quoteId) !== undefined
  }

  getQuoteIdByTxHash(txHash: string): string | undefined {
    return this.txHashIndex.get(txHash)
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
      const quote = this.store.get(oldestId)
      if (quote) {
        console.log(`[QuoteStore] Evicting oldest quote ${oldestId} to enforce max size cap`)
        this.remove(oldestId, quote)
      }
    }
  }

  private remove(quoteId: string, quote: StoredQuote): void {
    if (quote.txHash) {
      this.txHashIndex.delete(quote.txHash)
    }
    this.store.delete(quoteId)
  }

  private sweep(): void {
    const now = Date.now()
    let swept = 0
    for (const [id, quote] of this.store) {
      if (now > QuoteStore.statusDeadline(quote)) {
        this.remove(id, quote)
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
    this.txHashIndex.clear()
  }
}

export const quoteStore = new QuoteStore()
