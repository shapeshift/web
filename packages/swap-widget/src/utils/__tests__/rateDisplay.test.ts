import { describe, expect, it } from 'vitest'

import type { TradeRate } from '../../types'
import { SwapperName } from '../../types'
import { getRateAmountBaseUnit, getRatePenaltyPercent, sortRatesByValue } from '../rateDisplay'

const makeRate = (overrides: Partial<TradeRate>): TradeRate => ({
  swapperName: SwapperName.NearIntents,
  rate: '1',
  buyAmountCryptoBaseUnit: '100000',
  sellAmountCryptoBaseUnit: '1000000',
  steps: 1,
  shapeshiftBps: '60',
  affiliateBps: '60',
  ...overrides,
})

describe('rateDisplay', () => {
  describe('getRateAmountBaseUnit', () => {
    it('reads the sell side on exact output', () => {
      expect(getRateAmountBaseUnit(makeRate({}), true)).toBe('1000000')
    })

    it('reads the buy side otherwise', () => {
      expect(getRateAmountBaseUnit(makeRate({}), false)).toBe('100000')
    })
  })

  describe('sortRatesByValue', () => {
    // Every exact-output route buys the same amount, so the cheapest input is the best one
    it('puts the cheapest sell amount first on exact output', () => {
      const cheap = makeRate({ id: 'cheap', sellAmountCryptoBaseUnit: '64265399' })
      const dear = makeRate({ id: 'dear', sellAmountCryptoBaseUnit: '64412212' })

      expect(sortRatesByValue([dear, cheap], true).map(r => r.id)).toEqual(['cheap', 'dear'])
    })

    it('puts the largest buy amount first otherwise', () => {
      const small = makeRate({ id: 'small', buyAmountCryptoBaseUnit: '90000' })
      const large = makeRate({ id: 'large', buyAmountCryptoBaseUnit: '100000' })

      expect(sortRatesByValue([small, large], false).map(r => r.id)).toEqual(['large', 'small'])
    })

    it('drops errored rates and zero amounts on the side that matters', () => {
      const errored = makeRate({ id: 'errored', error: { code: 'x', message: 'y' } })
      const zeroSell = makeRate({ id: 'zeroSell', sellAmountCryptoBaseUnit: '0' })
      const ok = makeRate({ id: 'ok' })

      expect(sortRatesByValue([errored, zeroSell, ok], true).map(r => r.id)).toEqual(['ok'])
    })
  })

  describe('getRatePenaltyPercent', () => {
    // Paying 0.23% more for the same output is the exact-output penalty the old buy-side maths missed
    it('measures how much more a route costs on exact output', () => {
      expect(getRatePenaltyPercent('64265399', '64412212', true)).toBe('0.23')
    })

    it('measures how much less a route delivers otherwise', () => {
      expect(getRatePenaltyPercent('100000', '90000', false)).toBe('10.00')
    })

    it('ignores gaps within noise', () => {
      expect(getRatePenaltyPercent('100000', '100050', true)).toBeNull()
    })

    it('returns null when there is no best amount to compare against', () => {
      expect(getRatePenaltyPercent('0', '100000', true)).toBeNull()
    })
  })
})
