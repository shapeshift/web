import { describe, expect, it } from 'vitest'

import { TradeQuoteError } from '../../../types'
import type {
  FyndFeeBreakdown,
  FyndInfoResponse,
  FyndOrderQuote,
  FyndQuoteResponse,
  FyndTransaction,
} from '../types'
import { validateFyndInfoResponse, validateFyndQuoteResponse } from './validation'

type InvalidFyndInfoResponse = Omit<Partial<FyndInfoResponse>, 'router_address'> & {
  router_address: unknown
}

const VALID_TRANSACTION: FyndTransaction = {
  to: '0xda892c989d07a18b5dd3f392d949f00df15c5736',
  value: '0',
  data: '0x1234',
  client_fee_signature_offset: null,
}

const VALID_FEE_BREAKDOWN: FyndFeeBreakdown = {
  router_fee: '10',
  client_fee: '0',
  max_slippage: '100',
  min_amount_received: '990',
  swaps_hash: null,
}

const VALID_ORDER: FyndOrderQuote = {
  order_id: 'order-id',
  status: 'success',
  amount_in: '1000',
  amount_out: '1000',
  amount_out_net_gas: '990',
  gas_estimate: '21000',
  gas_price: '1000000000',
  price_impact_bps: 1,
  route: { swaps: [{ protocol: 'ekubo_v3' }] },
  transaction: VALID_TRANSACTION,
  fee_breakdown: VALID_FEE_BREAKDOWN,
}

const VALID_QUOTE_RESPONSE: FyndQuoteResponse = {
  orders: [VALID_ORDER],
  total_gas_estimate: '21000',
  solve_time_ms: 20,
}

describe('Fynd response validation', () => {
  it('accepts valid Ethereum info', () => {
    const result = validateFyndInfoResponse({
      chain_id: 1,
      router_address: '0xda892c989d07a18b5dd3f392d949f00df15c5736',
      permit2_address: null,
      version: '0.97.14',
    })

    expect(result.isOk()).toBe(true)
  })

  it.each([
    { chain_id: 10, router_address: VALID_TRANSACTION.to },
    { chain_id: 1, router_address: 'invalid' },
    { chain_id: 1, router_address: null },
  ])('rejects invalid Ethereum info', (invalidInfoResponse: InvalidFyndInfoResponse) => {
    const result = validateFyndInfoResponse(invalidInfoResponse)

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
  })

  it('accepts an encoded quote response', () => {
    expect(validateFyndQuoteResponse(VALID_QUOTE_RESPONSE, 'quote').isOk()).toBe(true)
  })

  it('accepts a rate response without encoding data', () => {
    const rateResponse: FyndQuoteResponse = {
      ...VALID_QUOTE_RESPONSE,
      orders: [{ ...VALID_ORDER, transaction: null, fee_breakdown: null }],
    }

    expect(validateFyndQuoteResponse(rateResponse, 'rate').isOk()).toBe(true)
  })

  it.each([
    { ...VALID_ORDER, amount_out: '-1' },
    { ...VALID_ORDER, amount_out: '0.5' },
    { ...VALID_ORDER, amount_out: '1e3' },
    { ...VALID_ORDER, gas_price: null },
    { ...VALID_ORDER, transaction: null },
    { ...VALID_ORDER, fee_breakdown: null },
    {
      ...VALID_ORDER,
      fee_breakdown: { ...VALID_FEE_BREAKDOWN, router_fee: '600', client_fee: '401' },
    },
  ])('rejects an invalid encoded quote', (invalidOrder: FyndOrderQuote) => {
    const result = validateFyndQuoteResponse(
      { ...VALID_QUOTE_RESPONSE, orders: [invalidOrder] },
      'quote',
    )

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
  })
})
