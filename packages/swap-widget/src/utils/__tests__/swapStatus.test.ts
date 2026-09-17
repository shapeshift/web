import { describe, expect, it } from 'vitest'

import {
  resolveDepositStatusEvent,
  resolveTxLinksEvent,
  shouldKeepTrackingDeposit,
} from '../swapStatus'

describe('resolveDepositStatusEvent', () => {
  it('reports a deposit once the sell tx hash appears', () => {
    expect(
      resolveDepositStatusEvent(
        {
          status: 'submitted',
          txHash: '0xdeposit',
          txLink: 'https://explorer/tx/0xdeposit',
          swapperTxLink: 'https://swapper/deposit',
        },
        false,
        500,
      ),
    ).toEqual({
      type: 'DEPOSIT_DETECTED',
      txHash: '0xdeposit',
      txLink: 'https://explorer/tx/0xdeposit',
      swapperTxLink: 'https://swapper/deposit',
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
      resolveDepositStatusEvent(
        {
          status: 'confirmed',
          txHash: '0xdeposit',
          buyTxLink: 'https://explorer/tx/0xpayout',
          swapperTxLink: 'https://swapper/deposit',
        },
        true,
        500,
      ),
    ).toEqual({
      type: 'STATUS_CONFIRMED',
      buyTxLink: 'https://explorer/tx/0xpayout',
      swapperTxLink: 'https://swapper/deposit',
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
      error: 'Something went wrong',
    })
  })

  it('fails with the swapper link, even before a deposit was seen', () => {
    expect(
      resolveDepositStatusEvent(
        { status: 'failed', swapperTxLink: 'https://swapper/deposit' },
        false,
        500,
      ),
    ).toEqual({
      type: 'STATUS_FAILED',
      error: 'Something went wrong',
      swapperTxLink: 'https://swapper/deposit',
    })
  })

  it('reports a swapper link that appears after the deposit was seen', () => {
    const response = {
      status: 'submitted' as const,
      txHash: '0xdeposit',
      txLink: 'https://explorer/tx/0xdeposit',
      swapperTxLink: 'https://swapper/deposit',
    }
    const known = 'https://explorer/tx/0xdeposit'

    expect(resolveDepositStatusEvent(response, true, 500, known, null)).toEqual({
      type: 'TX_LINKS_UPDATED',
      txLink: undefined,
      swapperTxLink: 'https://swapper/deposit',
    })
    expect(
      resolveDepositStatusEvent(response, true, 500, known, 'https://swapper/deposit'),
    ).toBeUndefined()
    expect(
      resolveDepositStatusEvent({ ...response, status: 'confirmed' }, true, 500, known, null),
    ).toEqual({
      type: 'STATUS_CONFIRMED',
      txLink: 'https://explorer/tx/0xdeposit',
      buyTxLink: undefined,
      swapperTxLink: 'https://swapper/deposit',
    })
  })

  it('keeps waiting while pending with no hash', () => {
    expect(resolveDepositStatusEvent({ status: 'pending' }, false, 500)).toBeUndefined()
  })
})

describe('resolveTxLinksEvent', () => {
  const response = {
    status: 'submitted' as const,
    txLink: 'https://explorer/tx/0xsell',
    swapperTxLink: 'https://swapper/swap',
  }

  it('reports both links on the first poll that carries them', () => {
    expect(resolveTxLinksEvent(response, { txLink: null, swapperTxLink: null })).toEqual({
      type: 'TX_LINKS_UPDATED',
      txLink: 'https://explorer/tx/0xsell',
      swapperTxLink: 'https://swapper/swap',
    })
  })

  it('reports only the link the caller does not have yet', () => {
    expect(
      resolveTxLinksEvent(response, {
        txLink: 'https://explorer/tx/0xsell',
        swapperTxLink: null,
      }),
    ).toEqual({
      type: 'TX_LINKS_UPDATED',
      txLink: undefined,
      swapperTxLink: 'https://swapper/swap',
    })
  })

  it('stays quiet when both links are unchanged or absent', () => {
    expect(
      resolveTxLinksEvent(response, {
        txLink: 'https://explorer/tx/0xsell',
        swapperTxLink: 'https://swapper/swap',
      }),
    ).toBeUndefined()
    expect(
      resolveTxLinksEvent({ status: 'submitted' }, { txLink: null, swapperTxLink: null }),
    ).toBeUndefined()
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

    it('follows settlement for a day from the deposit', () => {
      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt,
          now: depositObservedAt + 24 * hour,
        }),
      ).toBe(true)
    })

    it('gives up a day after the deposit, when the api has abandoned the swap', () => {
      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt,
          now: depositObservedAt + 24 * hour + 1,
        }),
      ).toBe(false)
    })

    it('does not keep polling a day past the deadline for a deposit seen early', () => {
      const seenEarly = quoteDeadline - 10 * 60 * 1000

      expect(
        shouldKeepTrackingDeposit({
          quoteDeadline,
          depositObservedAt: seenEarly,
          now: seenEarly + 24 * hour + 1,
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
