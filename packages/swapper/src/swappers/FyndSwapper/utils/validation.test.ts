import { describe, expect, it } from 'vitest'

import { TradeQuoteError } from '../../../types'
import { validateFyndInfoResponse, validateFyndQuoteResponse } from './validation'

const transaction = {
  to: '0xda892c989d07a18b5dd3f392d949f00df15c5736',
  value: '0',
  data: '0x1234',
  client_fee_signature_offset: null,
}

const feeBreakdown = {
  router_fee: '10',
  client_fee: '0',
  max_slippage: '100',
  min_amount_received: '990',
  swaps_hash: null,
}

const order = {
  order_id: 'order-id',
  status: 'success',
  amount_in: '1000',
  amount_out: '1000',
  amount_out_net_gas: '990',
  gas_estimate: '21000',
  gas_price: '1000000000',
  price_impact_bps: 1,
  route: { swaps: [{ protocol: 'ekubo_v3' }] },
  transaction,
  fee_breakdown: feeBreakdown,
}

const response = {
  orders: [order],
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
    { chain_id: 10, router_address: transaction.to },
    { chain_id: 1, router_address: 'invalid' },
    { chain_id: 1, router_address: null },
  ])('rejects invalid Ethereum info', value => {
    const result = validateFyndInfoResponse(value)

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
  })

  it('accepts an encoded quote response', () => {
    expect(validateFyndQuoteResponse(response, 'quote').isOk()).toBe(true)
  })

  it('accepts a rate response without encoding data', () => {
    const rateResponse = {
      ...response,
      orders: [{ ...order, transaction: null, fee_breakdown: null }],
    }

    expect(validateFyndQuoteResponse(rateResponse, 'rate').isOk()).toBe(true)
  })

  it.each([
    { ...order, amount_out: '-1' },
    { ...order, gas_price: null },
    { ...order, transaction: null },
    { ...order, fee_breakdown: null },
  ])('rejects an invalid encoded quote', invalidOrder => {
    const result = validateFyndQuoteResponse({ ...response, orders: [invalidOrder] }, 'quote')

    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
  })
})
