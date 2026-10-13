import { describe, expect, it } from 'vitest'

import { getFyndClientFeeBps } from './helpers'

describe('getFyndClientFeeBps', () => {
  it.each([
    ['nets the default fee after the 20% share', '60', 75],
    ['rounds up so the net never falls short', '55', 69],
    ['requests nothing for a fee-free swap', '0', 0],
  ])('%s', (_label, affiliateBps, grossBps) => {
    expect(getFyndClientFeeBps(affiliateBps)).toBe(grossBps)
  })
})
