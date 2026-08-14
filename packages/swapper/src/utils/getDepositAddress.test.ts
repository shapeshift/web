import { describe, expect, it } from 'vitest'

import { swappers } from '../constants'
import type { TradeQuoteStep } from '../types'
import { SwapperName } from '../types'
import { getDepositAddress } from './index'

const makeStep = (overrides: Partial<TradeQuoteStep>): TradeQuoteStep => overrides as TradeQuoteStep

describe('getDepositAddress', () => {
  it('reads the chainflip deposit address', () => {
    const step = makeStep({ chainflipSpecific: { depositAddress: 'bc1qdeposit' } })
    expect(getDepositAddress(step, SwapperName.Chainflip)).toBe('bc1qdeposit')
  })

  it('returns undefined when chainflip has no deposit address', () => {
    expect(getDepositAddress(makeStep({}), SwapperName.Chainflip)).toBeUndefined()
  })

  it('reads the near intents deposit address', () => {
    const step = makeStep({
      swapperMetadata: { name: 'nearIntents', depositAddress: '0xdeposit' },
    })
    expect(getDepositAddress(step, SwapperName.NearIntents)).toBe('0xdeposit')
  })

  it('rejects a memo-bound near intents deposit address', () => {
    const step = makeStep({
      swapperMetadata: { name: 'nearIntents', depositAddress: 'EQdeposit', depositMemo: '12345' },
    })
    expect(getDepositAddress(step, SwapperName.NearIntents)).toBeUndefined()
  })

  it('rejects an empty near intents deposit address', () => {
    const step = makeStep({ swapperMetadata: { name: 'nearIntents', depositAddress: '' } })
    expect(getDepositAddress(step, SwapperName.NearIntents)).toBeUndefined()
  })

  it('returns undefined for swappers that do not use deposit addresses', () => {
    const step = makeStep({ chainflipSpecific: { depositAddress: 'bc1qdeposit' } })
    expect(getDepositAddress(step, SwapperName.Relay)).toBeUndefined()
  })
})

describe('supportsExternalPayment', () => {
  it('is flagged on exactly the deposit-address swappers', () => {
    const flagged = Object.entries(swappers)
      .filter(([, swapper]) => swapper?.supportsExternalPayment)
      .map(([name]) => name)
      .sort()

    expect(flagged).toEqual([SwapperName.Chainflip, SwapperName.NearIntents].sort())
  })
})
