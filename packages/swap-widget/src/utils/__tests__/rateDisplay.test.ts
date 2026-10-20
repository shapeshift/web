import { describe, expect, it } from 'vitest'

import type { TradeRate } from '../../types'
import { SwapperName } from '../../types'
import { getRateAmountBaseUnit, getRateDiffPercent, sortRatesByValue } from '../rateDisplay'

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
      const cheap = makeRate({
        swapperName: SwapperName.Relay,
        sellAmountCryptoBaseUnit: '64265399',
      })
      const dear = makeRate({
        swapperName: SwapperName.Chainflip,
        sellAmountCryptoBaseUnit: '64412212',
      })

      expect(sortRatesByValue([dear, cheap], true)).toEqual([cheap, dear])
    })

    it('puts the largest buy amount first otherwise', () => {
      const small = makeRate({
        swapperName: SwapperName.Relay,
        buyAmountCryptoBaseUnit: '90000',
      })
      const large = makeRate({
        swapperName: SwapperName.Chainflip,
        buyAmountCryptoBaseUnit: '100000',
      })

      expect(sortRatesByValue([small, large], false)).toEqual([large, small])
    })

    it('drops errored rates and zero amounts on the side that matters', () => {
      const errored = makeRate({
        swapperName: SwapperName.Relay,
        error: { code: 'x', message: 'y' },
      })
      const zeroSell = makeRate({
        swapperName: SwapperName.Chainflip,
        sellAmountCryptoBaseUnit: '0',
      })
      const ok = makeRate({})

      expect(sortRatesByValue([errored, zeroSell, ok], true)).toEqual([ok])
    })
  })

  describe('getRateDiffPercent', () => {
    // The 0.23% the old buy-side maths could never surface, since every route buys the same
    it('measures how much more a route costs on exact output', () => {
      expect(getRateDiffPercent('64265399', '64412212', true)).toBe('0.23')
    })

    it('measures how much less a route delivers otherwise', () => {
      expect(getRateDiffPercent('100000', '90000', false)).toBe('10.00')
    })

    it('shows a gap the format can express', () => {
      expect(getRateDiffPercent('100000', '100050', true)).toBe('0.05')
    })

    it('shows the smallest gap two decimals can hold', () => {
      expect(getRateDiffPercent('100000', '100010', true)).toBe('0.01')
    })

    it('ignores gaps too small to render', () => {
      expect(getRateDiffPercent('100000', '100005', true)).toBeNull()
    })

    it('returns null when there is no best amount to compare against', () => {
      expect(getRateDiffPercent('0', '100000', true)).toBeNull()
    })
  })
})
