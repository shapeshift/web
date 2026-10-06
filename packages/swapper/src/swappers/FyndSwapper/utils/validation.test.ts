import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { TradeQuoteError } from '../../../types'
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
  price_impact_bps: -10,
  route: null,
  transaction,
  fee_breakdown: fees,
}
const context: Parameters<typeof validateFyndQuoteResponse>[1] = {
  chainId: KnownChainIds.EthereumMainnet,
  sellAmountCryptoBaseUnit: '1000',
  isNativeSell: false,
  slippageTolerancePercentageDecimal: '0.005',
}
const validate = (overrides: Record<string, unknown>) =>
  validateFyndQuoteResponse({ orders: [{ ...order, ...overrides }] }, context)

describe('Fynd response validation', () => {
  it('accepts nullable gas price and signed price impact', () => {
    expect(validate({}).isOk()).toBe(true)
  })

  it.each([
    ['sell amount', { amount_in: '999' }, 'Fynd returned invalid quote amounts'],
    ['negative output', { amount_out: '-1' }, 'Fynd returned invalid quote amounts'],
    ['fractional base units', { amount_out: '0.5' }, 'Fynd returned invalid quote amounts'],
    ['exponent base units', { amount_out: '1e3' }, 'Fynd returned invalid quote amounts'],
    ['fractional price impact', { price_impact_bps: 1.5 }, 'Fynd returned invalid quote amounts'],
    ['missing fees', { fee_breakdown: null }, 'Fynd returned a malformed fee breakdown'],
    [
      'fees exceed output',
      { fee_breakdown: { ...fees, router_fee: '1001' } },
      'Fynd fee breakdown does not add up to the quoted output',
    ],
    [
      'unexpected client fee',
      { fee_breakdown: { ...fees, client_fee: '1' } },
      'Fynd returned an unexpected client fee',
    ],
    ['missing transaction', { transaction: null }, 'Fynd quote is missing its transaction'],
    [
      'router target',
      { transaction: { ...transaction, to: unpinnedRouter } },
      `Fynd router ${unpinnedRouter} is not the pinned router ${router} for eip155:1`,
    ],
    [
      'token transaction value',
      { transaction: { ...transaction, value: '1' } },
      'Fynd returned an invalid transaction',
    ],
    [
      'signature placeholder',
      { transaction: { ...transaction, client_fee_signature_offset: 4 } },
      'Fynd returned an invalid transaction',
    ],
    [
      'empty calldata',
      { transaction: { ...transaction, data: '0x' } },
      'Fynd returned an invalid transaction',
    ],
    ['route without protocols', { route: { swaps: [{}] } }, 'Fynd returned a malformed route'],
  ])('rejects inconsistent %s with a specific message', (_label, overrides, message) => {
    const error = validate(overrides).unwrapErr()
    expect(error.code).toBe(TradeQuoteError.InvalidResponse)
    expect(error.message).toBe(message)
  })

  it('reports the returned and pinned routers on a router mismatch', () => {
    const error = validate({ transaction: { ...transaction, to: unpinnedRouter } }).unwrapErr()
    expect(error.details).toEqual({
      chainId: KnownChainIds.EthereumMainnet,
      router: unpinnedRouter,
      pinnedRouter: router,
    })
  })

  it('reports the allowed slippage when Fynd exceeds the requested tolerance', () => {
    const error = validate({
      fee_breakdown: { ...fees, max_slippage: '5', min_amount_received: '985' },
    }).unwrapErr()
    expect(error.message).toBe('Fynd slippage exceeds the requested tolerance')
    expect(error.details).toEqual({
      maxSlippage: '5',
      allowedMaxSlippage: '4',
      slippageTolerancePercentageDecimal: '0.005',
    })
  })

  it('binds native transaction value to the requested sell amount', () => {
    const nativeContext = { ...context, isNativeSell: true }
    expect(validateFyndQuoteResponse({ orders: [order] }, nativeContext).isErr()).toBe(true)
    expect(
      validateFyndQuoteResponse(
        {
          orders: [{ ...order, transaction: { ...transaction, value: '1000' } }],
        },
        nativeContext,
      ).isOk(),
    ).toBe(true)
  })

  it('requires exactly one response for the single requested order', () => {
    expect(validateFyndQuoteResponse({ orders: [] }, context).isErr()).toBe(true)
    expect(validateFyndQuoteResponse({ orders: [order, order] }, context).isErr()).toBe(true)
  })

  it.each([
    ['weaker output floor', '0.005', '1000', '10', '5', '985', false],
    ['stricter output floor', '0.005', '1000', '10', '3', '987', true],
    ['zero tolerance', '0', '1000', '10', '0', '990', true],
    ['loss at zero tolerance', '0', '1000', '10', '1', '989', false],
    ['six-decimal quantization', '0.0000019', '2000000', '0', '2', '1999998', true],
    ['loss beyond quantized tolerance', '0.0000019', '2000000', '0', '3', '1999997', false],
    [
      'large integer amounts',
      '0.005',
      '1000000000000000001',
      '1',
      '5000000000000000',
      '995000000000000000',
      true,
    ],
  ] as const)(
    'enforces requested slippage: %s',
    (_label, slippage, amountOut, routerFee, maxSlippage, minOutput, accepted) => {
      const result = validateFyndQuoteResponse(
        {
          orders: [
            {
              ...order,
              amount_out: amountOut,
              fee_breakdown: {
                ...fees,
                router_fee: routerFee,
                max_slippage: maxSlippage,
                min_amount_received: minOutput,
              },
            },
          ],
        },
        { ...context, slippageTolerancePercentageDecimal: slippage },
      )
      expect(result.isOk()).toBe(accepted)
    },
  )
})
