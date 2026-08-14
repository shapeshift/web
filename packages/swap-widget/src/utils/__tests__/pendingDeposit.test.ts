import { beforeEach, describe, expect, it } from 'vitest'

import type { QuoteResponse } from '../../types'
import { clearPendingDeposit, loadPendingDeposit, savePendingDeposit } from '../pendingDeposit'

const makeDeposit = (expiresAt: number) => ({
  quote: {
    quoteId: 'quote-1',
    depositAddress: 'bc1qdeposit',
    expiresAt,
  } as unknown as QuoteResponse,
  refundAddress: 'bc1qrefund',
  receiveAddress: '0xreceive',
  sellAmountBaseUnit: '10000000',
  buyAmountBaseUnit: undefined,
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

  it('drops an expired deposit', () => {
    savePendingDeposit(makeDeposit(10_000))

    expect(loadPendingDeposit(10_001)).toBeUndefined()
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
