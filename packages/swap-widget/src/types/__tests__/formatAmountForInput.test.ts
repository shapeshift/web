import { describe, expect, it } from 'vitest'

import { formatAmountForInput, parseAmount } from '..'

describe('formatAmountForInput', () => {
  it('leaves out the thousands separators formatAmount adds', () => {
    expect(formatAmountForInput('1234500000', 6)).toBe('1234.5')
  })

  it('keeps every decimal the asset has', () => {
    expect(formatAmountForInput('123456789012345678', 18)).toBe('0.123456789012345678')
  })

  it('round-trips back to the same base units', () => {
    const baseUnits = ['1234500000', '500000', '1']

    baseUnits.forEach(baseUnit => {
      expect(parseAmount(formatAmountForInput(baseUnit, 6), 6)).toBe(baseUnit)
    })
  })
})
