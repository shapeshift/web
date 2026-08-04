import type { OrderQuoteResponse } from '@shapeshiftoss/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ETH, FOX_MAINNET } from '../../../utils/test-data/assets'
import { getNowPlusThirtyMinutesTimestamp, getValuesFromQuoteResponse } from './helpers'

describe('getNowPlusThirtyMinutesTimestamp', () => {
  const mockDay = '2020-12-31'
  const mockTime = 'T23:59:59.000Z'
  const mockDate = `${mockDay}${mockTime}`

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date(mockDate))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return the timestamp corresponding to current time + 30 minutes (UTC)', () => {
    const timestamp = getNowPlusThirtyMinutesTimestamp()
    expect(timestamp).toEqual(1609460999)
    expect(new Date(timestamp * 1000).toUTCString()).toEqual('Fri, 01 Jan 2021 00:29:59 GMT')
  })
})

describe('getValuesFromQuoteResponse', () => {
  const response = {
    quote: {
      sellAmount: '9755648144619063874259',
      buyAmount: '289305614806369753',
      feeAmount: '184116879335769833472',
    },
  } as unknown as OrderQuoteResponse

  it('should deduct affiliate fees then slippage from the quoted buy amount', () => {
    const { buyAmountAfterFeesCryptoBaseUnit, buyAmountBeforeFeesCryptoBaseUnit } =
      getValuesFromQuoteResponse({
        buyAsset: ETH,
        sellAsset: FOX_MAINNET,
        response,
        affiliateBps: '0',
        slippageTolerancePercentageDecimal: '0.005',
      })

    expect(buyAmountAfterFeesCryptoBaseUnit).toEqual('287859086732337904')
    expect(buyAmountBeforeFeesCryptoBaseUnit).toEqual('294765636137893963')
  })

  it('should deduct affiliate fees before slippage', () => {
    // 100 bps = 1% affiliate fee off the quoted amount, then 0.5% slippage off the remainder
    const { buyAmountAfterFeesCryptoBaseUnit } = getValuesFromQuoteResponse({
      buyAsset: ETH,
      sellAsset: FOX_MAINNET,
      response,
      affiliateBps: '100',
      slippageTolerancePercentageDecimal: '0.005',
    })

    expect(buyAmountAfterFeesCryptoBaseUnit).toEqual('284980495865014525')
  })
})
