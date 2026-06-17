import { describe, expect, it } from 'vitest'

import { computeSellFiatSyncAction, cryptoToFiatInput, fiatToCrypto } from '../fiatConversion'

describe('fiatToCrypto', () => {
  it('converts fiat to crypto amount and base unit (18 decimals)', () => {
    // $100 at $3200/ETH => 0.03125 ETH
    const result = fiatToCrypto('100', '3200', 18)
    expect(result.amount).toBe('0.031250000000000000')
    expect(result.amountBaseUnit).toBe('31250000000000000')
  })

  it('returns empty/undefined for empty fiat input', () => {
    expect(fiatToCrypto('', '3200', 18)).toEqual({ amount: '', amountBaseUnit: undefined })
  })

  it('returns empty/undefined for missing or zero price', () => {
    expect(fiatToCrypto('100', '0', 18)).toEqual({ amount: '', amountBaseUnit: undefined })
    expect(fiatToCrypto('100', '', 18)).toEqual({ amount: '', amountBaseUnit: undefined })
  })

  it('returns empty/undefined for non-numeric fiat', () => {
    expect(fiatToCrypto('.', '3200', 18)).toEqual({ amount: '', amountBaseUnit: undefined })
  })

  it('handles sub-cent fiat amounts', () => {
    // $0.01 at $3200/ETH => 0.000003125 ETH => 3.125e12 base units
    expect(fiatToCrypto('0.01', '3200', 18).amountBaseUnit).toBe('3125000000000')
  })

  it('handles low-precision assets (USDC, 6 decimals)', () => {
    // $100 at $1/USDC => 100 USDC => 100_000000 base units
    expect(fiatToCrypto('100', '1', 6)).toEqual({
      amount: '100.000000',
      amountBaseUnit: '100000000',
    })
  })
})

describe('cryptoToFiatInput', () => {
  it('converts base unit to a 2-decimal fiat string', () => {
    expect(cryptoToFiatInput('31250000000000000', '3200', 18)).toBe('100.00')
  })

  it('returns empty for missing amount, zero amount, or missing price', () => {
    expect(cryptoToFiatInput(undefined, '3200', 18)).toBe('')
    expect(cryptoToFiatInput('0', '3200', 18)).toBe('')
    expect(cryptoToFiatInput('31250000000000000', '0', 18)).toBe('')
  })
})

describe('computeSellFiatSyncAction', () => {
  const base = {
    isSellAmountFiat: true,
    sellAmountFiat: '100',
    sellAmountBaseUnit: undefined as string | undefined,
    sellAssetUsdPrice: '3200' as string | undefined,
    sellPrecision: 18,
  }

  it('returns null when not in fiat mode', () => {
    expect(computeSellFiatSyncAction({ ...base, isSellAmountFiat: false })).toBeNull()
  })

  it('falls back to crypto mode when price is missing in fiat mode', () => {
    expect(computeSellFiatSyncAction({ ...base, sellAssetUsdPrice: undefined })).toEqual({
      type: 'SET_SELL_FIAT_MODE',
      isFiat: false,
      fiatValue: '',
    })
  })

  it('returns null when there is no fiat amount entered', () => {
    expect(computeSellFiatSyncAction({ ...base, sellAmountFiat: '' })).toBeNull()
  })

  it('emits a recomputed SET_SELL_AMOUNT when crypto differs from stored', () => {
    expect(computeSellFiatSyncAction(base)).toEqual({
      type: 'SET_SELL_AMOUNT',
      amount: '0.031250000000000000',
      amountBaseUnit: '31250000000000000',
      fiatValue: '100',
    })
  })

  it('returns null (idempotent) when recomputed crypto already matches stored', () => {
    expect(
      computeSellFiatSyncAction({ ...base, sellAmountBaseUnit: '31250000000000000' }),
    ).toBeNull()
  })
})
