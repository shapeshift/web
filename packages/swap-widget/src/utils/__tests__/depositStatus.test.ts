import { describe, expect, it } from 'vitest'

import { resolveDepositStatusEvent, shouldKeepTrackingDeposit } from '../depositStatus'

describe('resolveDepositStatusEvent', () => {
  it('reports a deposit once the sell tx hash appears', () => {
    expect(resolveDepositStatusEvent({ status: 'submitted', txHash: '0xdeposit' }, false)).toEqual({
      type: 'DEPOSIT_DETECTED',
      txHash: '0xdeposit',
    })
  })

  it('does not re-report a deposit that was already detected', () => {
    expect(
      resolveDepositStatusEvent({ status: 'submitted', txHash: '0xdeposit' }, true),
    ).toBeUndefined()
  })

  it('confirms the swap', () => {
    expect(resolveDepositStatusEvent({ status: 'confirmed', txHash: '0xdeposit' }, true)).toEqual({
      type: 'STATUS_CONFIRMED',
    })
  })

  it('confirms a swap whose deposit the provider never reported a hash for', () => {
    expect(resolveDepositStatusEvent({ status: 'confirmed' }, false)).toEqual({
      type: 'STATUS_CONFIRMED',
    })
  })

  it('fails the swap', () => {
    expect(resolveDepositStatusEvent({ status: 'failed' }, true)).toEqual({
      type: 'STATUS_FAILED',
      error: 'Swap failed',
    })
  })

  it('keeps waiting while pending with no hash', () => {
    expect(resolveDepositStatusEvent({ status: 'pending' }, false)).toBeUndefined()
  })
})

describe('shouldKeepTrackingDeposit', () => {
  const expiresAt = 1_000_000
  const hour = 60 * 60 * 1000

  it('keeps tracking through the deposit window', () => {
    expect(
      shouldKeepTrackingDeposit({ expiresAt, hasDetectedDeposit: false, now: expiresAt - 1 }),
    ).toBe(true)
  })

  it('keeps tracking for a late deposit the provider may still credit', () => {
    expect(
      shouldKeepTrackingDeposit({ expiresAt, hasDetectedDeposit: false, now: expiresAt + hour }),
    ).toBe(true)
  })

  it('gives up once the api can no longer resolve the quote', () => {
    expect(
      shouldKeepTrackingDeposit({
        expiresAt,
        hasDetectedDeposit: false,
        now: expiresAt + hour + 1,
      }),
    ).toBe(false)
  })

  it('follows a detected deposit however long settlement takes', () => {
    expect(
      shouldKeepTrackingDeposit({
        expiresAt,
        hasDetectedDeposit: true,
        now: expiresAt + hour * 24,
      }),
    ).toBe(true)
  })
})

describe('a deposit that confirms within one poll', () => {
  it('reports detection first, since awaiting_deposit cannot handle a terminal status', () => {
    expect(
      resolveDepositStatusEvent({ status: 'confirmed', txHash: '0xdead' }, false),
    ).toEqual({ type: 'DEPOSIT_DETECTED', txHash: '0xdead' })
  })

  it('confirms on the next poll, once the deposit is known', () => {
    expect(resolveDepositStatusEvent({ status: 'confirmed', txHash: '0xdead' }, true)).toEqual({
      type: 'STATUS_CONFIRMED',
    })
  })
})
