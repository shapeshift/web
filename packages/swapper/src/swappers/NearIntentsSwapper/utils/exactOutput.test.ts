import { describe, expect, it } from 'vitest'

import type { TradeAmount } from '../../../types'
import { QuoteRequest } from '../types'
import { buildNearIntentsQuoteRequest } from './helpers'

const BASE_ARGS = {
  originAsset: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
  destinationAsset: 'nep141:btc.omft.near',
  amount: { direction: 'exactIn', cryptoBaseUnit: '65000000' } satisfies TradeAmount,
  slippageTolerancePercentageDecimal: '0.01',
  affiliateBps: '10',
  refundTo: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  recipient: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
  recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
  deadline: '2026-08-10T23:59:00.000Z',
}

const EXACT_OUTPUT_AMOUNT = {
  direction: 'exactOut',
  cryptoBaseUnit: '100000',
} satisfies TradeAmount

describe('buildNearIntentsQuoteRequest', () => {
  describe('exact input', () => {
    it('requests EXACT_INPUT with the sell amount', () => {
      const request = buildNearIntentsQuoteRequest(BASE_ARGS)

      expect(request.swapType).toEqual(QuoteRequest.swapType.EXACT_INPUT)
      expect(request.amount).toEqual('65000000')
    })

    it('passes the requested slippage through untouched', () => {
      const request = buildNearIntentsQuoteRequest({
        ...BASE_ARGS,
        slippageTolerancePercentageDecimal: '0',
      })

      expect(request.slippageTolerance).toEqual(0)
    })
  })

  describe('exact output', () => {
    it('requests EXACT_OUTPUT with the buy amount', () => {
      const request = buildNearIntentsQuoteRequest({ ...BASE_ARGS, amount: EXACT_OUTPUT_AMOUNT })

      expect(request.swapType).toEqual(QuoteRequest.swapType.EXACT_OUTPUT)
      expect(request.amount).toEqual('100000')
    })

    // A tighter band is the user's call - the failure mode is a refund, not a loss
    it('passes a requested zero slippage through untouched, as exact input does', () => {
      const request = buildNearIntentsQuoteRequest({
        ...BASE_ARGS,
        amount: EXACT_OUTPUT_AMOUNT,
        slippageTolerancePercentageDecimal: '0',
      })

      expect(request.slippageTolerance).toEqual(0)
    })

    it('honours a requested slippage', () => {
      const request = buildNearIntentsQuoteRequest({
        ...BASE_ARGS,
        amount: EXACT_OUTPUT_AMOUNT,
        slippageTolerancePercentageDecimal: '0.05',
      })

      expect(request.slippageTolerance).toEqual(500)
    })
  })
})
