import { describe, expect, it, vi } from 'vitest'

vi.mock('@/context/QueryClientProvider/queryClient', () => ({ queryClient: {} }))
vi.mock('@/pages/Lending/hooks/useGetEstimatedFeesQuery', () => ({ queryFn: vi.fn() }))
vi.mock('@/pages/Lending/hooks/useIsSweepNeededQuery', () => ({
  getIsSweepNeeded: vi.fn(),
  isGetSweepNeededInput: vi.fn(),
}))
vi.mock('@/state/slices/common-selectors', () => ({
  selectPortfolioCryptoBalanceByFilter: vi.fn(),
}))
vi.mock('@/state/slices/selectors', () => ({
  selectFeeAssetById: vi.fn(),
  selectMarketDataByAssetIdUserCurrency: vi.fn(),
}))
vi.mock('@/state/store', () => ({ store: { getState: vi.fn() } }))
vi.mock('./hooks/useGetThorchainSaversDepositQuoteQuery', () => ({
  fetchThorchainDepositQuote: vi.fn(),
}))
vi.mock('./hooks/useGetThorchainSaversWithdrawQuoteQuery', () => ({
  fetchThorchainWithdrawQuote: vi.fn(),
}))

import {
  getHasEnoughBalanceForTxPlusFees,
  getHasEnoughBalanceForTxPlusFeesPlusSweep,
} from './balance'

describe('getHasEnoughBalanceForTxPlusFees', () => {
  const precision = 8

  it('returns false when balance is zero', () => {
    expect(
      getHasEnoughBalanceForTxPlusFees({
        balanceCryptoBaseUnit: '0',
        amountCryptoPrecision: '1',
        txFeeCryptoBaseUnit: '100000',
        precision,
      }),
    ).toBe(false)
  })

  it('returns true when balance covers amount + fee exactly', () => {
    // amount: 0.5 BTC = 50000000 sats, fee: 10000 sats, total: 50010000 sats
    expect(
      getHasEnoughBalanceForTxPlusFees({
        balanceCryptoBaseUnit: '50010000',
        amountCryptoPrecision: '0.5',
        txFeeCryptoBaseUnit: '10000',
        precision,
      }),
    ).toBe(true)
  })

  it('returns true when balance exceeds amount + fee', () => {
    expect(
      getHasEnoughBalanceForTxPlusFees({
        balanceCryptoBaseUnit: '100000000',
        amountCryptoPrecision: '0.5',
        txFeeCryptoBaseUnit: '10000',
        precision,
      }),
    ).toBe(true)
  })

  it('returns false when balance does not cover amount + fee', () => {
    expect(
      getHasEnoughBalanceForTxPlusFees({
        balanceCryptoBaseUnit: '50000000',
        amountCryptoPrecision: '0.5',
        txFeeCryptoBaseUnit: '10000',
        precision,
      }),
    ).toBe(false)
  })

  it('works with 18-decimal precision', () => {
    const ethPrecision = 18
    // balance: 1 ETH, amount: 0.9 ETH, fee: 0.01 ETH
    expect(
      getHasEnoughBalanceForTxPlusFees({
        balanceCryptoBaseUnit: '1000000000000000000',
        amountCryptoPrecision: '0.9',
        txFeeCryptoBaseUnit: '10000000000000000',
        precision: ethPrecision,
      }),
    ).toBe(true)
  })

  it('returns false when zero amount but fee exceeds balance', () => {
    expect(
      getHasEnoughBalanceForTxPlusFees({
        balanceCryptoBaseUnit: '1000',
        amountCryptoPrecision: '0',
        txFeeCryptoBaseUnit: '2000',
        precision,
      }),
    ).toBe(false)
  })

  it('handles empty fee string as zero fee', () => {
    expect(
      getHasEnoughBalanceForTxPlusFees({
        balanceCryptoBaseUnit: '100000000',
        amountCryptoPrecision: '0.5',
        txFeeCryptoBaseUnit: '',
        precision,
      }),
    ).toBe(true)
  })
})

describe('getHasEnoughBalanceForTxPlusFeesPlusSweep', () => {
  const precision = 8

  it('returns hasEnoughBalance false and missingFunds "0" when balance is zero', () => {
    const result = getHasEnoughBalanceForTxPlusFeesPlusSweep({
      balanceCryptoBaseUnit: '0',
      amountCryptoPrecision: '1',
      txFeeCryptoBaseUnit: '10000',
      precision,
      sweepTxFeeCryptoBaseUnit: '5000',
    })
    expect(result.hasEnoughBalance).toBe(false)
    expect(result.missingFunds).toBe('0')
  })

  it('returns hasEnoughBalance true when balance covers amount + fee + sweep exactly', () => {
    // amount: 0.5 BTC = 50000000 sats, fee: 10000, sweep: 5000, total: 50015000
    const result = getHasEnoughBalanceForTxPlusFeesPlusSweep({
      balanceCryptoBaseUnit: '50015000',
      amountCryptoPrecision: '0.5',
      txFeeCryptoBaseUnit: '10000',
      precision,
      sweepTxFeeCryptoBaseUnit: '5000',
    })
    expect(result.hasEnoughBalance).toBe(true)
  })

  it('returns hasEnoughBalance false with correct missingFunds when balance is insufficient', () => {
    // balance: 50000000 (0.5 BTC), total needed: 50015000, missing: 15000 sats = 0.00015
    const result = getHasEnoughBalanceForTxPlusFeesPlusSweep({
      balanceCryptoBaseUnit: '50000000',
      amountCryptoPrecision: '0.5',
      txFeeCryptoBaseUnit: '10000',
      precision,
      sweepTxFeeCryptoBaseUnit: '5000',
    })
    expect(result.hasEnoughBalance).toBe(false)
    expect(result.missingFunds).toBe('0.00015')
  })

  it('returns negative missingFunds when balance exceeds total cost', () => {
    // balance: 1 BTC, total needed: 50015000 sats, surplus: -0.49985 BTC
    const result = getHasEnoughBalanceForTxPlusFeesPlusSweep({
      balanceCryptoBaseUnit: '100000000',
      amountCryptoPrecision: '0.5',
      txFeeCryptoBaseUnit: '10000',
      precision,
      sweepTxFeeCryptoBaseUnit: '5000',
    })
    expect(result.hasEnoughBalance).toBe(true)
    expect(result.missingFunds).toBe('-0.49985')
  })

  it('handles zero sweep fee', () => {
    const result = getHasEnoughBalanceForTxPlusFeesPlusSweep({
      balanceCryptoBaseUnit: '50010000',
      amountCryptoPrecision: '0.5',
      txFeeCryptoBaseUnit: '10000',
      precision,
      sweepTxFeeCryptoBaseUnit: '0',
    })
    expect(result.hasEnoughBalance).toBe(true)
  })

  it('works with 18-decimal precision', () => {
    const ethPrecision = 18
    // balance: 1 ETH, amount: 0.9 ETH, fee: 0.01 ETH, sweep: 0.005 ETH
    const result = getHasEnoughBalanceForTxPlusFeesPlusSweep({
      balanceCryptoBaseUnit: '1000000000000000000',
      amountCryptoPrecision: '0.9',
      txFeeCryptoBaseUnit: '10000000000000000',
      precision: ethPrecision,
      sweepTxFeeCryptoBaseUnit: '5000000000000000',
    })
    expect(result.hasEnoughBalance).toBe(true)
    expect(result.missingFunds).toBe('-0.085')
  })

  it('handles empty fee strings as zero', () => {
    const result = getHasEnoughBalanceForTxPlusFeesPlusSweep({
      balanceCryptoBaseUnit: '100000000',
      amountCryptoPrecision: '0.5',
      txFeeCryptoBaseUnit: '',
      precision,
      sweepTxFeeCryptoBaseUnit: '',
    })
    expect(result.hasEnoughBalance).toBe(true)
  })
})
