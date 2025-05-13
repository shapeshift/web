import { describe, expect, it } from 'vitest'

import { calculateFeeUsd } from './model'

import { bn } from '@/lib/bignumber/bignumber'

describe('calculateFeeUsd', () => {
  it('should calculate 55 bps fee for any trade amount', () => {
    const tradeAmountUsd = bn(1000)
    const { feeUsd } = calculateFeeUsd({ tradeAmountUsd })
    expect(feeUsd.toNumber()).toEqual(5.5) // 1000 * 0.0055 = 5.5
  })

  it('should calculate 55 bps fee for large trade amount', () => {
    const tradeAmountUsd = bn(1_000_000)
    const { feeUsd } = calculateFeeUsd({ tradeAmountUsd })
    expect(feeUsd.toNumber()).toEqual(5500) // 1_000_000 * 0.0055 = 5500
  })

  it('should calculate 55 bps fee for small trade amount', () => {
    const tradeAmountUsd = bn(1)
    const { feeUsd } = calculateFeeUsd({ tradeAmountUsd })
    expect(feeUsd.toNumber()).toEqual(0.0055) // 1 * 0.0055 = 0.0055
  })
})
