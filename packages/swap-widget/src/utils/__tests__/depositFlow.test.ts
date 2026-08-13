import { describe, expect, it } from 'vitest'

import type { TradeRate } from '../../types'
import { isDepositCapableRate, shouldUseDepositFlow } from '../depositFlow'

const makeRate = (overrides: Partial<TradeRate>): TradeRate =>
  ({
    swapperName: 'Chainflip' as TradeRate['swapperName'],
    rate: '1',
    buyAmountCryptoBaseUnit: '1',
    sellAmountCryptoBaseUnit: '1',
    steps: 1,
    shapeshiftBps: '0',
    affiliateBps: '0',
    ...overrides,
  }) as TradeRate

describe('isDepositCapableRate', () => {
  it('is true when the rate reports deposit-address support', () => {
    expect(isDepositCapableRate(makeRate({ supportsDepositAddress: true }))).toBe(true)
  })

  it('is false when the flag is absent', () => {
    expect(isDepositCapableRate(makeRate({}))).toBe(false)
  })
})

describe('shouldUseDepositFlow', () => {
  it('is true for a deposit-capable rate with no wallet on the sell chain', () => {
    const rate = makeRate({ supportsDepositAddress: true })
    expect(shouldUseDepositFlow({ rate, hasWalletForSellChain: false })).toBe(true)
  })

  it('is false once a wallet is connected for the sell chain', () => {
    const rate = makeRate({ supportsDepositAddress: true })
    expect(shouldUseDepositFlow({ rate, hasWalletForSellChain: true })).toBe(false)
  })

  it('is false for a wallet-only swapper', () => {
    expect(shouldUseDepositFlow({ rate: makeRate({}), hasWalletForSellChain: false })).toBe(false)
  })

  it('is false with no rate', () => {
    expect(shouldUseDepositFlow({ rate: undefined, hasWalletForSellChain: false })).toBe(false)
  })
})
