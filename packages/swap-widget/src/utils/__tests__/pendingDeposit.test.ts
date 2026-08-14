import { beforeEach, describe, expect, it } from 'vitest'

import type { QuoteResponse } from '../../types'
import { clearPendingDeposit, loadPendingDeposit, savePendingDeposit } from '../pendingDeposit'

const makeDeposit = (expiresAt: number) => ({
  quote: {
    quoteId: 'quote-1',
    depositAddress: 'bc1qdeposit',
    expiresAt,
    sellAmountCryptoBaseUnit: '10000000',
    buyAmountAfterFeesCryptoBaseUnit: '5000',
    sellAsset: { chainId: 'bip122:x', precision: 8 },
    buyAsset: { chainId: 'eip155:1', precision: 18 },
  } as unknown as QuoteResponse,
  refundAddress: 'bc1qrefund',
  receiveAddress: '0xreceive',
  sellAmountBaseUnit: '10000000',
  buyAmountBaseUnit: undefined,
  txHash: undefined,
  depositObservedAt: undefined,
})

describe('pendingDeposit', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a pending deposit', () => {
    savePendingDeposit(makeDeposit(10_000))

    expect(loadPendingDeposit(5_000)?.quote.depositAddress).toBe('bc1qdeposit')
    expect(loadPendingDeposit(5_000)?.refundAddress).toBe('bc1qrefund')
    expect(loadPendingDeposit(5_000)?.receiveAddress).toBe('0xreceive')
    expect(loadPendingDeposit(5_000)?.sellAmountBaseUnit).toBe('10000000')
  })

  it('keeps a just-expired deposit, which the provider may still credit', () => {
    savePendingDeposit(makeDeposit(10_000))

    expect(loadPendingDeposit(10_001)).not.toBeUndefined()
  })

  it('drops one past the window the api can still resolve', () => {
    savePendingDeposit(makeDeposit(10_000))

    expect(loadPendingDeposit(10_000 + 60 * 60 * 1000 + 1)).toBeUndefined()
  })

  it('keeps a funded deposit for a settlement window timed from the deposit', () => {
    const observedAt = 10_000 + 60 * 60 * 1000
    savePendingDeposit({ ...makeDeposit(10_000), txHash: '0xdead', depositObservedAt: observedAt })

    expect(loadPendingDeposit(observedAt + 60 * 60 * 1000)?.txHash).toBe('0xdead')
    expect(loadPendingDeposit(observedAt + 60 * 60 * 1000 + 1)).toBeUndefined()
  })

  it('ignores a funded deposit with no observation time to resume from', () => {
    savePendingDeposit({
      ...makeDeposit(10_000),
      txHash: '0xdead',
      depositObservedAt: undefined,
    })

    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })

  it('forgets a cleared deposit', () => {
    savePendingDeposit(makeDeposit(10_000))
    clearPendingDeposit()

    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })

  it('ignores a quote with no deposit address', () => {
    savePendingDeposit({
      quote: { quoteId: 'quote-1', expiresAt: 10_000 } as unknown as QuoteResponse,
      refundAddress: 'bc1qrefund',
      receiveAddress: '0xreceive',
      sellAmountBaseUnit: '10000000',
      buyAmountBaseUnit: undefined,
      txHash: undefined,
      depositObservedAt: undefined,
    })

    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('ssw:pendingDeposit', 'not json')

    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })
})

describe('countdown across a restore', () => {
  // expiresAt is an absolute timestamp, so a restore resumes the countdown where it left off
  // rather than handing the user a fresh full window
  it('returns the original deadline, not a refreshed one', () => {
    const quotedAt = 1_000_000
    const expiresAt = quotedAt + 60_000

    savePendingDeposit(makeDeposit(expiresAt))

    const restoredAfter45s = loadPendingDeposit(quotedAt + 45_000)

    expect(restoredAfter45s?.quote.expiresAt).toBe(expiresAt)
    expect((restoredAfter45s?.quote.expiresAt ?? 0) - (quotedAt + 45_000)).toBe(15_000)
  })
})

describe('rejecting entries restoration would crash on', () => {
  const validQuote = {
    depositAddress: 'bc1qdeposit',
    expiresAt: 10_000,
    sellAmountCryptoBaseUnit: '10000000',
    buyAmountAfterFeesCryptoBaseUnit: '5000',
    sellAsset: { chainId: 'bip122:x', precision: 8 },
    buyAsset: { chainId: 'eip155:1', precision: 18 },
  }

  const save = (quote: unknown) =>
    localStorage.setItem(
      'ssw:pendingDeposit',
      JSON.stringify({ quote, refundAddress: 'bc1qrefund', receiveAddress: '0xreceive' }),
    )

  it('accepts a complete quote', () => {
    save(validQuote)
    expect(loadPendingDeposit(5_000)).not.toBeUndefined()
  })

  it('rejects a quote missing its assets', () => {
    save({ ...validQuote, sellAsset: undefined })
    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })

  it('rejects an asset without a precision', () => {
    save({ ...validQuote, buyAsset: { chainId: 'eip155:1' } })
    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })

  it('rejects a quote missing its amounts', () => {
    save({ ...validQuote, sellAmountCryptoBaseUnit: undefined })
    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })
})
