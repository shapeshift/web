import { aptosAssetId, aptosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import type { PanoraQuote, PanoraSwapResponse, PanoraTradeRateInput } from '../types'
import { getPanoraTradeAmounts, validatePanoraSwap } from './helpers'

const APT = { assetId: aptosAssetId, chainId: aptosChainId, precision: 8, symbol: 'APT' } as Asset
const USDC = {
  assetId: 'aptos:1/fungible:0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
  chainId: aptosChainId,
  precision: 6,
  symbol: 'USDC',
} as Asset

// 10 APT -> USDC with a 0.6% integrator fee, from a live /swap response
const quote = { toTokenAmount: '5.573706', feeTokenAmount: '0.033644' } as PanoraQuote

describe('validatePanoraSwap', () => {
  it('rejects tokens whose decimals do not match the trade assets', () => {
    const response = {
      fromToken: { address: '0xa', decimals: 8 },
      toToken: { address: USDC.assetId, decimals: 8 },
      feeToken: { address: USDC.assetId, decimals: 8 },
      quotes: [quote],
    } as PanoraSwapResponse

    const result = validatePanoraSwap({ response, sellAsset: APT, buyAsset: USDC })

    expect(result.unwrapErr().code).toBe('UnsupportedTradePair')
  })
})

describe('getPanoraTradeAmounts', () => {
  it('adds the integrator fee back for the before-fees amount and reports it exactly', () => {
    const input = {
      sellAsset: APT,
      buyAsset: USDC,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000',
    } as PanoraTradeRateInput

    const amounts = getPanoraTradeAmounts({ input, quote })

    expect(amounts.buyAmountAfterFeesCryptoBaseUnit).toBe('5573706')
    expect(amounts.buyAmountBeforeFeesCryptoBaseUnit).toBe('5607350')
    expect(amounts.affiliateFee?.amountCryptoBaseUnit).toBe('33644')
    expect(amounts.affiliateFee?.assetId).toBe(USDC.assetId)
  })
})
