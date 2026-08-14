import { describe, expect, it } from 'vitest'

import { resolveDepositStatusEvent, shouldKeepTrackingDeposit } from '../depositStatus'

describe('resolveDepositStatusEvent', () => {
  it('reports a deposit once the sell tx hash appears', () => {
    expect(
      resolveDepositStatusEvent({ status: 'submitted', txHash: '0xdeposit' }, false, 500),
    ).toEqual({
      type: 'DEPOSIT_DETECTED',
      txHash: '0xdeposit',
      observedAt: 500,
    })
  })

  it('does not re-report a deposit that was already detected', () => {
    expect(
      resolveDepositStatusEvent({ status: 'submitted', txHash: '0xdeposit' }, true, 500),
    ).toBeUndefined()
  })

  it('confirms the swap', () => {
    expect(
      resolveDepositStatusEvent({ status: 'confirmed', txHash: '0xdeposit' }, true, 500),
    ).toEqual({
      type: 'STATUS_CONFIRMED',
    })
  })

  it('confirms a swap whose deposit the provider never reported a hash for', () => {
    expect(resolveDepositStatusEvent({ status: 'confirmed' }, false, 500)).toEqual({
      type: 'STATUS_CONFIRMED',
    })
  })

  it('fails the swap', () => {
    expect(resolveDepositStatusEvent({ status: 'failed' }, true, 500)).toEqual({
      type: 'STATUS_FAILED',
      error: 'Swap failed',
    })
  })

  it('keeps waiting while pending with no hash', () => {
    expect(resolveDepositStatusEvent({ status: 'pending' }, false, 500)).toBeUndefined()
  })
})

describe('shouldKeepTrackingDeposit', () => {
  const quoteDeadline = 1_000_000
  const hour = 60 * 60 * 1000

  describe('before a deposit is seen, the window runs from the quote deadline', () => {
    it('keeps tracking through the deposit window', () => {
      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt: undefined,
          now: quoteDeadline - 1,
        }),
      ).toBe(true)
    })

    it('keeps tracking for a late deposit the provider may still credit', () => {
      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt: undefined,
          now: quoteDeadline + hour,
        }),
      ).toBe(true)
    })

    it('gives up once the api can no longer resolve the quote', () => {
      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt: undefined,
          now: quoteDeadline + hour + 1,
        }),
      ).toBe(false)
    })
  })

  describe('once a deposit is seen, the window runs from the deposit', () => {
    // Late enough that the unfunded window would already have closed
    const depositObservedAt = quoteDeadline + hour

    it('follows settlement for an hour from the deposit', () => {
      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt,
          now: depositObservedAt + hour,
        }),
      ).toBe(true)
    })

    it('gives up an hour after the deposit, when the api drops the quote', () => {
      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt,
          now: depositObservedAt + hour + 1,
        }),
      ).toBe(false)
    })

    it('does not keep polling an hour past the deadline for a deposit seen early', () => {
      const seenEarly = quoteDeadline - 10 * 60 * 1000

      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt: seenEarly,
          now: seenEarly + hour + 1,
        }),
      ).toBe(false)
    })
  })
})

describe('a deposit that confirms within one poll', () => {
  it('reports detection first, since awaiting_deposit cannot handle a terminal status', () => {
    expect(
      resolveDepositStatusEvent({ status: 'confirmed', txHash: '0xdead' }, false, 500),
    ).toEqual({
      type: 'DEPOSIT_DETECTED',
      txHash: '0xdead',
      observedAt: 500,
    })
  })

  it('confirms on the next poll, once the deposit is known', () => {
    expect(resolveDepositStatusEvent({ status: 'confirmed', txHash: '0xdead' }, true, 500)).toEqual(
      {
        type: 'STATUS_CONFIRMED',
      },
    )
  })
})
