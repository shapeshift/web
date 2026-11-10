import { aptosAssetId, aptosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import type { PanoraTradeRateInput } from '../types'
import { getPanoraTradeAmounts, validatePanoraSwap } from './helpers'
import { swapResponse } from './testData'

const APT = { assetId: aptosAssetId, chainId: aptosChainId, precision: 8, symbol: 'APT' } as Asset
const USDC = {
  assetId: 'aptos:1/fungible:0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
  chainId: aptosChainId,
  precision: 6,
  symbol: 'USDC',
} as Asset

const RECIPIENT = '0xed8c46bec9dbc2b23c60568f822b95b87ea395f7e3fdb5e3adc0a30c55c0a60e'
const FEE_ADDRESS = '0x00000000000000000000000000000000000000000000000000000000000000fe'

const validArgs = {
  response: swapResponse,
  sellAsset: APT,
  buyAsset: USDC,
  sellAmountCryptoBaseUnit: '1000000000',
  toWalletAddress: RECIPIENT,
  integratorFeeAddress: FEE_ADDRESS,
}

describe('validatePanoraSwap', () => {
  it('returns the router call as a sequence number entry function payload', () => {
    const { payload } = validatePanoraSwap(validArgs).unwrap()

    // 0x02 is the EntryFunction payload variant, not the orderless inner payload Panora returns
    expect(payload.startsWith('0x02')).toBe(true)
  })

  it('rejects a transaction paying out to another recipient', () => {
    const result = validatePanoraSwap({ ...validArgs, toWalletAddress: FEE_ADDRESS })

    expect(result.unwrapErr().message).toMatch(/wrong recipient/)
  })

  it('rejects a transaction selling a different amount than quoted', () => {
    const result = validatePanoraSwap({ ...validArgs, sellAmountCryptoBaseUnit: '999999999' })

    expect(result.unwrapErr().message).toMatch(/different amount/)
  })

  it('rejects a transaction paying the integrator fee to another address', () => {
    const result = validatePanoraSwap({ ...validArgs, integratorFeeAddress: RECIPIENT })

    expect(result.unwrapErr().message).toMatch(/integrator fee elsewhere/)
  })

  it('rejects tokens whose decimals do not match the trade assets', () => {
    const result = validatePanoraSwap({ ...validArgs, buyAsset: { ...USDC, precision: 8 } })

    expect(result.unwrapErr().code).toBe('UnsupportedTradePair')
  })

  it('rejects an empty route', () => {
    const result = validatePanoraSwap({ ...validArgs, response: { ...swapResponse, quotes: [] } })

    expect(result.unwrapErr().code).toBe('NoRouteFound')
  })
})

describe('getPanoraTradeAmounts', () => {
  it('adds the integrator fee back for the before-fees amount and reports it exactly', () => {
    const input = {
      sellAsset: APT,
      buyAsset: USDC,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000',
    } as PanoraTradeRateInput

    const amounts = getPanoraTradeAmounts({ input, quote: swapResponse.quotes[0] })

    expect(amounts.buyAmountAfterFeesCryptoBaseUnit).toBe('5573706')
    expect(amounts.buyAmountBeforeFeesCryptoBaseUnit).toBe('5607350')
    expect(amounts.affiliateFee?.amountCryptoBaseUnit).toBe('33644')
    expect(amounts.affiliateFee?.assetId).toBe(USDC.assetId)
  })
})
