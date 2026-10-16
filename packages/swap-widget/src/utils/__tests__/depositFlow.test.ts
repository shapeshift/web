import { describe, expect, it } from 'vitest'

import type { TradeRate } from '../../types'
import {
  getActiveRate,
  isExternalPaymentRate,
  isSwappableRate,
  pickDefaultRate,
  pickDepositRate,
  shouldUseDepositFlow,
} from '../depositFlow'

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

describe('isExternalPaymentRate', () => {
  it('is true when the rate reports deposit-address support', () => {
    expect(isExternalPaymentRate(makeRate({ supportsExternalPayment: true }))).toBe(true)
  })

  it('is false when the flag is absent', () => {
    expect(isExternalPaymentRate(makeRate({}))).toBe(false)
  })
})

describe('shouldUseDepositFlow', () => {
  it('is true for a deposit-capable rate with no wallet on the sell chain', () => {
    const rate = makeRate({ supportsExternalPayment: true })
    expect(shouldUseDepositFlow({ rate, hasWalletForSellChain: false })).toBe(true)
  })

  it('is false once a wallet is connected for the sell chain', () => {
    const rate = makeRate({ supportsExternalPayment: true })
    expect(shouldUseDepositFlow({ rate, hasWalletForSellChain: true })).toBe(false)
  })

  it('is false for a wallet-only swapper', () => {
    expect(shouldUseDepositFlow({ rate: makeRate({}), hasWalletForSellChain: false })).toBe(false)
  })

  it('is false with no rate', () => {
    expect(shouldUseDepositFlow({ rate: undefined, hasWalletForSellChain: false })).toBe(false)
  })
})

describe('pickDepositRate', () => {
  const chainflip = makeRate({ supportsExternalPayment: true })
  const near = makeRate({
    swapperName: 'NEAR Intents' as TradeRate['swapperName'],
    supportsExternalPayment: true,
  })
  const relay = makeRate({ swapperName: 'Relay' as TradeRate['swapperName'] })

  it('keeps the swapper that was already quoted', () => {
    expect(pickDepositRate([relay, chainflip, near], 'NEAR Intents')).toBe(near)
  })

  it('falls back to the best externally payable rate when that swapper no longer rates', () => {
    expect(pickDepositRate([relay, chainflip, near], 'THORChain')).toBe(chainflip)
  })

  it('never picks a wallet-only swapper', () => {
    expect(pickDepositRate([relay], 'Relay')).toBeUndefined()
  })

  it('is undefined with no rates', () => {
    expect(pickDepositRate(undefined, 'Chainflip')).toBeUndefined()
  })
})

describe('isSwappableRate', () => {
  const ethereum = 'eip155:1'
  const zcash = 'bip122:00040fe8ec8471911baa1db1266ea15d'

  it('is any route on a chain the widget signs for', () => {
    expect(isSwappableRate(ethereum, makeRate({ supportsExternalPayment: false }))).toBe(true)
    expect(isSwappableRate(ethereum, makeRate({ supportsExternalPayment: true }))).toBe(true)
  })

  it('is only an externally paid route on a chain the widget cannot sign for', () => {
    expect(isSwappableRate(zcash, makeRate({ supportsExternalPayment: true }))).toBe(true)
    expect(isSwappableRate(zcash, makeRate({ supportsExternalPayment: false }))).toBe(false)
    expect(isSwappableRate(zcash, makeRate({}))).toBe(false)
  })
})

describe('pickDefaultRate', () => {
  const ethereum = 'eip155:1'
  const zcash = 'bip122:00040fe8ec8471911baa1db1266ea15d'
  const maya = makeRate({
    swapperName: 'MAYAChain' as TradeRate['swapperName'],
    supportsExternalPayment: false,
  })
  const near = makeRate({
    swapperName: 'NEAR Intents' as TradeRate['swapperName'],
    supportsExternalPayment: true,
  })

  it('takes the best rate on a chain the widget signs for', () => {
    expect(pickDefaultRate([maya, near], ethereum)).toBe(maya)
  })

  it('takes the best swappable rate on a chain the widget cannot sign for', () => {
    expect(pickDefaultRate([maya, near], zcash)).toBe(near)
  })

  it('falls back to the best rate when none can run here', () => {
    expect(pickDefaultRate([maya], zcash)).toBe(maya)
    expect(pickDefaultRate(undefined, zcash)).toBeUndefined()
  })
})

describe('getActiveRate', () => {
  const zcash = 'bip122:00040fe8ec8471911baa1db1266ea15d'
  const maya = makeRate({
    swapperName: 'MAYAChain' as TradeRate['swapperName'],
    supportsExternalPayment: false,
  })
  const near = makeRate({
    swapperName: 'NEAR Intents' as TradeRate['swapperName'],
    supportsExternalPayment: true,
  })
  const staleMaya = { ...maya, buyAmountCryptoBaseUnit: '2' }

  it('follows the picked swapper into each new poll', () => {
    expect(getActiveRate([near, maya], staleMaya, zcash)).toBe(maya)
  })

  it('falls back to the default when the picked swapper stopped quoting', () => {
    expect(getActiveRate([near], staleMaya, zcash)).toBe(near)
  })

  it('is the default when nothing was picked', () => {
    expect(getActiveRate([maya, near], null, zcash)).toBe(near)
  })
})
