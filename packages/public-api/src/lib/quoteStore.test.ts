import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoredQuote } from './quoteStore'
import { QuoteStore } from './quoteStore'

const makeQuote = (overrides: Partial<StoredQuote> = {}): StoredQuote => ({
  quoteId: 'quote-1',
  swapperName: '0x',
  sellAssetId: 'eip155:1/slip44:60',
  buyAssetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  sellAmountCryptoBaseUnit: '1000000000000000000',
  buyAmountAfterFeesCryptoBaseUnit: '1800000000',
  affiliateAddress: '0x1234',
  affiliateBps: '10',
  sellChainId: 'eip155:1',
  receiveAddress: '0xdead',
  sendAddress: undefined,
  rate: '1800',
  createdAt: Date.now(),
  expiresAt: Date.now() + QuoteStore.QUOTE_TTL_MS,
  metadata: {},
  stepChainIds: ['eip155:1'],
  status: 'pending',
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

  describe('set / get', () => {
    it('stores and retrieves a quote', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      expect(store.get(quote.quoteId)).toEqual(quote)
    })

    it('returns undefined for unknown quoteId', () => {
      expect(store.get('unknown')).toBeUndefined()
    })
  })

  describe('TTL — unsubmitted quotes', () => {
    it('returns quote within QUOTE_TTL_MS', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QuoteStore.QUOTE_TTL_MS - 1)
      expect(store.get(quote.quoteId)).toBeDefined()
    })

    it('expires quote after QUOTE_TTL_MS', () => {
      const quote = makeQuote()
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QuoteStore.QUOTE_TTL_MS + 1)
      expect(store.get(quote.quoteId)).toBeUndefined()
    })
  })

  describe('TTL — submitted quotes', () => {
    it('uses EXECUTION_TTL_MS after txHash is bound', () => {
      const now = Date.now()
      const quote = makeQuote({
        txHash: '0xabc',
        registeredAt: now,
        expiresAt: now + QuoteStore.QUOTE_TTL_MS,
        status: 'submitted',
      })
      store.set(quote.quoteId, quote)

      // past QUOTE_TTL but within EXECUTION_TTL
      vi.advanceTimersByTime(QuoteStore.QUOTE_TTL_MS + 1)
      expect(store.get(quote.quoteId)).toBeDefined()
    })

    it('expires submitted quote after EXECUTION_TTL_MS', () => {
      const now = Date.now()
      const quote = makeQuote({
        txHash: '0xabc',
        registeredAt: now,
        status: 'submitted',
      })
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QuoteStore.EXECUTION_TTL_MS + 1)
      expect(store.get(quote.quoteId)).toBeUndefined()
    })

    it('falls back to createdAt when registeredAt is absent', () => {
      const now = Date.now()
      const quote = makeQuote({ txHash: '0xabc', createdAt: now, status: 'submitted' })
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QuoteStore.EXECUTION_TTL_MS + 1)
      expect(store.get(quote.quoteId)).toBeUndefined()
    })
  })

  describe('txHash index', () => {
    it('hasTxHash returns true for a stored txHash', () => {
      const quote = makeQuote({ txHash: '0xabc', status: 'submitted' })
      store.set(quote.quoteId, quote)
      expect(store.hasTxHash('0xabc')).toBe(true)
    })

    it('hasTxHash returns false for unknown txHash', () => {
      expect(store.hasTxHash('0xunknown')).toBe(false)
    })

    it('getQuoteIdByTxHash returns the correct quoteId', () => {
      const quote = makeQuote({ txHash: '0xabc', status: 'submitted' })
      store.set(quote.quoteId, quote)
      expect(store.getQuoteIdByTxHash('0xabc')).toBe(quote.quoteId)
    })

    it('hasTxHash returns false after quote expires', () => {
      const now = Date.now()
      const quote = makeQuote({ txHash: '0xabc', registeredAt: now, status: 'submitted' })
      store.set(quote.quoteId, quote)
      vi.advanceTimersByTime(QuoteStore.EXECUTION_TTL_MS + 1)
      expect(store.hasTxHash('0xabc')).toBe(false)
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

      vi.advanceTimersByTime(QuoteStore.QUOTE_TTL_MS + QuoteStore.CLEANUP_INTERVAL_MS + 1)

      expect(store.size()).toBe(0)
    })

    it('cleans up txHash index on sweep', () => {
      const now = Date.now()
      const quote = makeQuote({ txHash: '0xabc', registeredAt: now, status: 'submitted' })
      store.set(quote.quoteId, quote)

      vi.advanceTimersByTime(QuoteStore.EXECUTION_TTL_MS + QuoteStore.CLEANUP_INTERVAL_MS + 1)

      expect(store.hasTxHash('0xabc')).toBe(false)
    })
  })
})
