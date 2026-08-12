import { describe, expect, it } from 'vitest'

import { swappers } from './constants'
import { getTradeQuotes, getTradeRates } from './swapper'
import type {
  GetExactOutputTradeQuoteInput,
  GetExactOutputTradeRateInput,
  SwapperDeps,
} from './types'
import { SwapperName, TradeQuoteError } from './types'
import { BTC, ETH } from './utils/test-data/assets'

// Exact-output support is structural - a swapper cannot claim it without implementing it
describe('exact output capability', () => {
  it('is implemented by the swappers whose upstream API can honour an exact buy amount', () => {
    for (const swapperName of [SwapperName.NearIntents, SwapperName.Relay]) {
      expect(swappers[swapperName]?.getExactOutputTradeRate).toBeDefined()
      expect(swappers[swapperName]?.getExactOutputTradeQuote).toBeDefined()
    }
  })

  it('is absent everywhere else', () => {
    const exactOutputCapable = Object.values(SwapperName).filter(
      swapperName => swappers[swapperName]?.getExactOutputTradeRate !== undefined,
    )

    expect(exactOutputCapable).toEqual([SwapperName.Relay, SwapperName.NearIntents])
  })
})

const exactOutputInput = {
  sellAsset: ETH,
  buyAsset: BTC,
  buyAmountCryptoBaseUnit: '100000',
  affiliateBps: '0',
  allowMultiHop: true,
  receiveAddress: undefined,
  accountNumber: undefined,
  quoteOrRate: 'rate',
} as unknown as GetExactOutputTradeRateInput

const deps = {} as SwapperDeps

describe('getTradeRates on an exact buy amount', () => {
  // Silently omitting these would read as the swapper being unavailable rather than unable
  it('reports an error for a swapper that cannot quote one', async () => {
    const result = await getTradeRates(exactOutputInput, SwapperName.Thorchain, deps)

    expect(result).toBeDefined()
    expect(result?.isErr()).toBe(true)
    expect(result?.unwrapErr().code).toEqual(TradeQuoteError.ExactOutputNotSupported)
    expect(result?.swapperName).toEqual(SwapperName.Thorchain)
  })

  it('skips entirely on a zero buy amount', async () => {
    const result = await getTradeRates(
      { ...exactOutputInput, buyAmountCryptoBaseUnit: '0' },
      SwapperName.Thorchain,
      deps,
    )

    expect(result).toBeUndefined()
  })

  // The base-unit regex upstream admits padded zeros, so the check can't be a string comparison
  it('skips entirely on a padded zero buy amount', async () => {
    const result = await getTradeRates(
      { ...exactOutputInput, buyAmountCryptoBaseUnit: '00' },
      SwapperName.Thorchain,
      deps,
    )

    expect(result).toBeUndefined()
  })
})

// Quotes dispatch on the same input shape as rates, so they gate the same way
describe('getTradeQuotes on an exact buy amount', () => {
  const exactOutputQuoteInput = {
    ...exactOutputInput,
    receiveAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    accountNumber: 0,
    quoteOrRate: 'quote',
  } as unknown as GetExactOutputTradeQuoteInput

  it('reports an error for a swapper that cannot quote one', async () => {
    const result = await getTradeQuotes(exactOutputQuoteInput, SwapperName.Thorchain, deps)

    expect(result).toBeDefined()
    expect(result?.isErr()).toBe(true)
    expect(result?.unwrapErr().code).toEqual(TradeQuoteError.ExactOutputNotSupported)
    expect(result?.swapperName).toEqual(SwapperName.Thorchain)
  })

  it('skips entirely on a zero buy amount', async () => {
    const result = await getTradeQuotes(
      { ...exactOutputQuoteInput, buyAmountCryptoBaseUnit: '0' },
      SwapperName.Thorchain,
      deps,
    )

    expect(result).toBeUndefined()
  })
})
