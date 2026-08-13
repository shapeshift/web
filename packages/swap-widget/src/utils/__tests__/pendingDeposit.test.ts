import { beforeEach, describe, expect, it } from 'vitest'

import type { QuoteResponse } from '../../types'
import { clearPendingDeposit, loadPendingDeposit, savePendingDeposit } from '../pendingDeposit'

const makeDeposit = (expiresAt: number) => ({
  quote: {
    quoteId: 'quote-1',
    depositAddress: 'bc1qdeposit',
    expiresAt,
  } as unknown as QuoteResponse,
  sendAddress: 'bc1qrefund',
})

describe('pendingDeposit', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a pending deposit', () => {
    savePendingDeposit(makeDeposit(10_000))

    expect(loadPendingDeposit(5_000)?.quote.depositAddress).toBe('bc1qdeposit')
    expect(loadPendingDeposit(5_000)?.sendAddress).toBe('bc1qrefund')
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
      sendAddress: 'bc1qrefund',
    })

    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('ssw:pendingDeposit', 'not json')

    expect(loadPendingDeposit(5_000)).toBeUndefined()
  })
})
