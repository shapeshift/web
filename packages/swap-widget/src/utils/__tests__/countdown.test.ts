import { describe, expect, it } from 'vitest'

import { formatCountdown } from '../countdown'

describe('formatCountdown', () => {
  it('formats minutes and seconds', () => {
    expect(formatCountdown(343_000)).toBe('5:43')
  })

  it('pads seconds', () => {
    expect(formatCountdown(61_000)).toBe('1:01')
  })

  it('formats hours when the window is long', () => {
    expect(formatCountdown(6 * 60 * 60 * 1000)).toBe('6:00:00')
  })

  it('clamps at zero', () => {
    expect(formatCountdown(-5_000)).toBe('0:00')
  })
})
