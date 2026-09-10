import { describe, expect, it } from 'vitest'

import { shouldPollRates } from '../ratesPolling'

describe('shouldPollRates', () => {
  it.each(['idle', 'input', 'quoting', 'error', 'deposit_expired'])('polls in %s', state => {
    expect(shouldPollRates(state)).toBe(true)
  })

  it.each([
    'awaiting_deposit',
    'approval_needed',
    'approving',
    'executing',
    'polling_status',
    'complete',
  ])('stops in %s', state => {
    expect(shouldPollRates(state)).toBe(false)
  })
})
