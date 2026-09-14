import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoredQuote } from './quoteStore'
import { QuoteStore } from './quoteStore'

const QUOTE_WINDOW_MS = 15 * 60 * 1000

const makeQuote = (overrides: Partial<StoredQuote> = {}): StoredQuote => ({
  quoteId: 'quote-1',
  swapperName: '0x',
  sellAssetId: 'eip155:1/slip44:60',
  buyAssetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  sellAmountCryptoBaseUnit: '1000000000000000000',
  buyAmountAfterFeesCryptoBaseUnit: '1800000000',
  partnerAddress: '0x1234',
  partnerBps: '50',
  shapeshiftBps: '10',
  affiliateBps: '60',
  receiveAddress: '0xdead',
  sendAddress: '0xsender',
  rate: '1800',
  createdAt: Date.now(),
  quoteDeadline: Date.now() + QUOTE_WINDOW_MS,
  metadata: {
    stepIndex: 0,
    quoteId: 'quote-1',
  },
  ...overrides,
})

describe('QuoteStore', () => {
  let store: QuoteStore

  beforeEach(() => {
    vi.useFakeTimers()
    store = new QuoteStore()
  })

  afterEach(() => {
    store.destroy()
    vi.useRealTimers()
  })

  describe('set / get / delete', () => {
    it('stores and retrieves a quote', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      expect(store.get(quote.quoteId)).toEqual(quote)
    })

    it('returns undefined for unknown quoteId', () => {
      expect(store.get('unknown')).toBeUndefined()
    })

    it('forgets a quote once it is deleted', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      store.delete(quote.quoteId)
      expect(store.get(quote.quoteId)).toBeUndefined()
      expect(store.size()).toBe(0)
    })
  })

  describe('retention', () => {
    it('keeps a quote past its deadline, so a slow first status call can still register', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QUOTE_WINDOW_MS + QuoteStore.BIND_GRACE_MS - 1)
      expect(store.get(quote.quoteId)).toBeDefined()
    })

    it('expires a quote once the bind grace runs out', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QUOTE_WINDOW_MS + QuoteStore.BIND_GRACE_MS + 1)
      expect(store.get(quote.quoteId)).toBeUndefined()
    })

    it('retains a quote awaiting a registration retry on the same window', () => {
      const quote = makeQuote({ txHash: '0xabc' })
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QUOTE_WINDOW_MS + QuoteStore.BIND_GRACE_MS - 1)
      expect(store.get(quote.quoteId)?.txHash).toBe('0xabc')
    })
  })

  describe('capacity eviction', () => {
    it('evicts the oldest quote when MAX_QUOTES is reached', () => {
      const oldest = makeQuote({ quoteId: 'oldest', createdAt: Date.now() - 1000 })
      store.set(oldest.quoteId, oldest)

      for (let i = 0; i < QuoteStore.MAX_QUOTES - 1; i++) {
        const q = makeQuote({ quoteId: `quote-${i}`, createdAt: Date.now() })
        store.set(q.quoteId, q)
      }

      expect(store.size()).toBe(QuoteStore.MAX_QUOTES)

      const overflow = makeQuote({ quoteId: 'overflow' })
      store.set(overflow.quoteId, overflow)

      expect(store.get('oldest')).toBeUndefined()
      expect(store.get('overflow')).toBeDefined()
      expect(store.size()).toBe(QuoteStore.MAX_QUOTES)
    })
  })

  describe('sweep', () => {
    it('removes expired quotes on sweep interval', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      expect(store.size()).toBe(1)

      const pastRetention = QUOTE_WINDOW_MS + QuoteStore.BIND_GRACE_MS
      vi.advanceTimersByTime(pastRetention + QuoteStore.CLEANUP_INTERVAL_MS + 1)

      expect(store.size()).toBe(0)
    })
  })
})
