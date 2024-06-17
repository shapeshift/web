import { describe, expect, it } from 'vitest'

import { getLimitWithManualSlippage } from './getLimitWithManualSlippage'

describe('getLimitWithManualSlippage', () => {
  it('should remove slippage from expected amount out', () => {
    const amountOut = '100'
    const expectedLimitWithManualSlippage = '50'

    const slippageBps = 5000 // 50%

    const limitWithManualSlippage = getLimitWithManualSlippage({
      expectedAmountOutThorBaseUnit: amountOut,
      slippageBps,
    })

    expect(limitWithManualSlippage).toBe(expectedLimitWithManualSlippage)
  })
})
