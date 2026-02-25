import type { ChainId } from '@shapeshiftoss/caip'

export type StoredQuote = {
  quoteId: string
  swapperName: string
  sellAssetId: string
  buyAssetId: string
  sellAmountCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  affiliateAddress: string | undefined
  affiliateBps: string
  sellChainId: ChainId
  receiveAddress: string
  sendAddress: string | undefined
  rate: string
  createdAt: number
  expiresAt: number
  metadata: {
    chainflipSwapId?: number
    nearIntentsDepositAddress?: string
    nearIntentsDepositMemo?: string
    relayId?: string
    cowswapOrderUid?: string
    acrossDepositId?: string
  }
  stepChainIds: ChainId[]
  txHash?: string
  registeredAt?: number
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
}

/**
 * In-memory quote store with dual TTL:
 * - 15 minutes for unsubmitted quotes (quote validity window)
 * - 60 minutes after txHash is bound (execution tracking window)
 *
 * Automatic sweep of expired entries every 60 seconds.
 * Migration path: swap to Redis with zero code changes (same get/set/delete interface).
 */
export class QuoteStore {
  private store = new Map<string, StoredQuote>()
  private txHashIndex = new Map<string, string>()
  private cleanupInterval: ReturnType<typeof setInterval>

  static readonly QUOTE_TTL_MS = 2 * 60 * 1000
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

  get(quoteId: string): StoredQuote | undefined {
    const quote = this.store.get(quoteId)
    if (!quote) return undefined

    const now = Date.now()
    const effectiveExpiry = quote.txHash
      ? (quote.registeredAt ?? quote.createdAt) + QuoteStore.EXECUTION_TTL_MS
      : quote.expiresAt

    if (now > effectiveExpiry) {
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
      const effectiveExpiry = quote.txHash
        ? (quote.registeredAt ?? quote.createdAt) + QuoteStore.EXECUTION_TTL_MS
        : quote.expiresAt

      if (now > effectiveExpiry) {
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
