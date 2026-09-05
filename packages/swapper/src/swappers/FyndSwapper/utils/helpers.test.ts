import { describe, expect, it } from 'vitest'

import { calculateFyndAmounts, calculateFyndRouterFee } from './helpers'

describe('Fynd fee calculations', () => {
  it('calculates the default 0.1 bps router fee using integer arithmetic', () => {
    expect(calculateFyndRouterFee('1000000')).toBe('10')
  })

  it('subtracts router and client fees from the expected output', () => {
    expect(
      calculateFyndAmounts({ amountOut: '1000000', routerFee: '1010', clientFee: '4000' }),
    ).toEqual({
      buyAmountBeforeFeesCryptoBaseUnit: '1000000',
      buyAmountAfterFeesCryptoBaseUnit: '994990',
    })
  })
})
