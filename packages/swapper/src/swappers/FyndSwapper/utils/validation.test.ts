import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { FYND_CHAINS } from './constants'
import { validateFyndQuoteResponse } from './validation'

const router = FYND_CHAINS['eip155:1'].routerAddress
const unpinnedRouter = '0x1111111111111111111111111111111111111111'
const transaction = {
  to: router,
  value: '0',
  data: '0x12345678',
  client_fee_signature_offset: null,
}
const fees = { router_fee: '10', client_fee: '0', max_slippage: '4', min_amount_received: '986' }
const order = {
  status: 'success' as const,
  amount_in: '1000',
  amount_out: '1000',
  gas_estimate: '21000',
  transaction,
  fee_breakdown: fees,
}
const context: Parameters<typeof validateFyndQuoteResponse>[1] = {
  chainId: KnownChainIds.EthereumMainnet,
  sellAmountCryptoBaseUnit: '1000',
  isNativeSell: false,
  slippageTolerancePercentageDecimal: '0.005',
  clientFeeBps: 0,
}
const validate = (overrides: Record<string, unknown>, contextOverrides = {}) =>
  validateFyndQuoteResponse(
    { orders: [{ ...order, ...overrides }] },
    { ...context, ...contextOverrides },
  )

describe('Fynd response validation', () => {
  it('accepts a quote that matches the request', () => {
    expect(validate({}).isOk()).toBe(true)
  })

  it.each([
    ['an unpinned router', { transaction: { ...transaction, to: unpinnedRouter } }],
    ['a different sell amount', { amount_in: '999' }],
    ['native value on a token sell', { transaction: { ...transaction, value: '1' } }],
    [
      'an output floor looser than the slippage',
      { fee_breakdown: { ...fees, min_amount_received: '984' } },
    ],
    ['a client fee we did not request', { fee_breakdown: { ...fees, client_fee: '1' } }],
  ])('rejects %s', (_label, overrides) => {
    expect(validate(overrides).isErr()).toBe(true)
  })

  it('binds native transaction value to the requested sell amount', () => {
    expect(validate({}, { isNativeSell: true }).isErr()).toBe(true)
    expect(
      validate({ transaction: { ...transaction, value: '1000' } }, { isNativeSell: true }).isOk(),
    ).toBe(true)
  })

  it('maps a missing route to NoRouteFound', () => {
    const result = validateFyndQuoteResponse({ orders: [{ status: 'no_route_found' }] }, context)
    expect(result.unwrapErr().code).toBe('NoRouteFound')
  })

  describe('with a client fee', () => {
    const feeContext = { clientFeeBps: 75 }
    const feeOrder = {
      transaction: {
        ...transaction,
        data: `0x12345678${'ab'.repeat(65)}`,
        client_fee_signature_offset: 4,
      },
      fee_breakdown: {
        router_fee: '2',
        client_fee: '6',
        max_slippage: '4',
        min_amount_received: '988',
      },
      client_fee_deadline: 1_900_000_000,
    }

    it('accepts a signed quote carrying our share of the fee', () => {
      expect(validate(feeOrder, feeContext).isOk()).toBe(true)
    })

    it.each([
      [
        'a fee below our share',
        {
          fee_breakdown: { ...feeOrder.fee_breakdown, client_fee: '4', min_amount_received: '990' },
        },
      ],
      [
        'an unsigned placeholder',
        { transaction: { ...feeOrder.transaction, data: `0x12345678${'00'.repeat(65)}` } },
      ],
      ['a missing deadline', { client_fee_deadline: null }],
    ])('rejects %s', (_label, overrides) => {
      expect(validate({ ...feeOrder, ...overrides }, feeContext).isErr()).toBe(true)
    })
  })
})
