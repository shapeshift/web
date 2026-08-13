import { describe, expect, it } from 'vitest'

import { resolveDepositStatusEvent } from '../depositStatus'

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

  it('confirms the swap even if the deposit was never separately observed', () => {
    expect(resolveDepositStatusEvent({ status: 'confirmed', txHash: '0xdeposit' }, false)).toEqual({
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
