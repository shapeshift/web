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
const fees = {
  router_fee: '10',
  client_fee: '0',
  max_slippage: '4',
  min_amount_received: '986',
  swaps_hash: null,
}
const order = {
  order_id: 'test',
  status: 'success',
  amount_in: '1000',
  amount_out: '1000',
  gas_estimate: '21000',
  gas_price: null,
  route: null,
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
    ['a different sell amount', { amount_in: '999' }, 'Fynd returned invalid quote amounts'],
    [
      'fees that do not add up to the output',
      { fee_breakdown: { ...fees, router_fee: '1001' } },
      'Fynd fee breakdown does not add up to the quoted output',
    ],
    [
      'a client fee we did not request',
      { fee_breakdown: { ...fees, client_fee: '1' } },
      'Fynd returned an unexpected client fee',
    ],
    [
      'an unpinned router',
      { transaction: { ...transaction, to: unpinnedRouter } },
      `Fynd router ${unpinnedRouter} is not the pinned router ${router} for eip155:1`,
    ],
    [
      'native value on a token sell',
      { transaction: { ...transaction, value: '1' } },
      'Fynd returned an invalid transaction',
    ],
  ])('rejects %s', (_label, overrides, message) => {
    expect(validate(overrides).unwrapErr().message).toBe(message)
  })

  it('binds native transaction value to the requested sell amount', () => {
    expect(validate({}, { isNativeSell: true }).isErr()).toBe(true)
    expect(
      validate({ transaction: { ...transaction, value: '1000' } }, { isNativeSell: true }).isOk(),
    ).toBe(true)
  })

  it.each([
    ['weaker output floor', '0.005', '1000', '10', '5', '985', false],
    ['stricter output floor', '0.005', '1000', '10', '3', '987', true],
    ['zero tolerance', '0', '1000', '10', '0', '990', true],
    ['loss at zero tolerance', '0', '1000', '10', '1', '989', false],
    ['six-decimal quantization', '0.0000019', '2000000', '0', '2', '1999998', true],
    ['loss beyond quantized tolerance', '0.0000019', '2000000', '0', '3', '1999997', false],
  ] as const)(
    'enforces requested slippage: %s',
    (_label, slippage, amountOut, routerFee, maxSlippage, minOutput, accepted) => {
      const result = validate(
        {
          amount_out: amountOut,
          fee_breakdown: {
            ...fees,
            router_fee: routerFee,
            max_slippage: maxSlippage,
            min_amount_received: minOutput,
          },
        },
        { slippageTolerancePercentageDecimal: slippage },
      )
      expect(result.isOk()).toBe(accepted)
    },
  )

  describe('with a client fee', () => {
    const feeContext = { clientFeeBps: 75 }
    const feeOrder = {
      transaction: {
        ...transaction,
        data: `0x12345678${'ab'.repeat(65)}`,
        client_fee_signature_offset: 4,
      },
      fee_breakdown: {
        ...fees,
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
        'Fynd client fee is below the requested share',
      ],
      [
        'an unsigned placeholder',
        { transaction: { ...feeOrder.transaction, data: `0x12345678${'00'.repeat(65)}` } },
        'Fynd returned an invalid transaction',
      ],
      [
        'a missing deadline',
        { client_fee_deadline: null },
        'Fynd quote is missing its client fee deadline',
      ],
    ])('rejects %s', (_label, overrides, message) => {
      expect(validate({ ...feeOrder, ...overrides }, feeContext).unwrapErr().message).toBe(message)
    })
  })
})
