import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { isAddress, isHex } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type {
  FyndFeeBreakdown,
  FyndInfoResponse,
  FyndOrderQuote,
  FyndQuoteResponse,
} from '../types'

const FYND_ETHEREUM_CHAIN_ID = 1
const FYND_QUOTE_STATUSES = new Set<FyndOrderQuote['status']>([
  'success',
  'no_route_found',
  'insufficient_liquidity',
  'timeout',
  'not_ready',
  'price_check_failed',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value)

const isNonNegativeNumericString = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+$/.test(value) && bn(value).isFinite() && bn(value).gte(0)

const makeInvalidResponseError = (message: string): SwapErrorRight =>
  makeSwapErrorRight({ message, code: TradeQuoteError.InvalidResponse })

const isValidTransaction = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.to === 'string' &&
  isAddress(value.to) &&
  typeof value.data === 'string' &&
  isHex(value.data) &&
  isNonNegativeNumericString(value.value) &&
  (value.client_fee_signature_offset === null ||
    (typeof value.client_fee_signature_offset === 'number' &&
      Number.isInteger(value.client_fee_signature_offset) &&
      value.client_fee_signature_offset >= 0))

const isValidFeeBreakdown = (value: unknown): value is FyndFeeBreakdown =>
  isRecord(value) &&
  isNonNegativeNumericString(value.router_fee) &&
  isNonNegativeNumericString(value.client_fee) &&
  isNonNegativeNumericString(value.max_slippage) &&
  isNonNegativeNumericString(value.min_amount_received) &&
  (value.swaps_hash === null || typeof value.swaps_hash === 'string')

const isValidRoute = (value: unknown): boolean =>
  value === null ||
  (isRecord(value) &&
    isUnknownArray(value.swaps) &&
    value.swaps.every(
      (swap: unknown) =>
        isRecord(swap) && typeof swap.protocol === 'string' && swap.protocol.length > 0,
    ))

const isValidOrder = (value: unknown, quoteOrRate: 'quote' | 'rate'): value is FyndOrderQuote => {
  if (!isRecord(value)) return false
  if (
    typeof value.status !== 'string' ||
    !FYND_QUOTE_STATUSES.has(value.status as FyndOrderQuote['status'])
  ) {
    return false
  }
  if (
    typeof value.order_id !== 'string' ||
    !isNonNegativeNumericString(value.amount_in) ||
    !isNonNegativeNumericString(value.amount_out) ||
    !isNonNegativeNumericString(value.amount_out_net_gas) ||
    !isNonNegativeNumericString(value.gas_estimate) ||
    !isNonNegativeNumericString(value.gas_price)
  ) {
    return false
  }
  if (
    !isValidRoute(value.route) ||
    (value.price_impact_bps !== null &&
      (typeof value.price_impact_bps !== 'number' ||
        !Number.isFinite(value.price_impact_bps) ||
        value.price_impact_bps < 0))
  ) {
    return false
  }
  if (quoteOrRate === 'quote' && value.status === 'success') {
    if (!isValidTransaction(value.transaction) || !isValidFeeBreakdown(value.fee_breakdown)) {
      return false
    }

    const totalFees = bn(value.fee_breakdown.router_fee).plus(value.fee_breakdown.client_fee)
    return totalFees.lte(value.amount_out)
  }
  return true
}

export const validateFyndInfoResponse = (
  value: unknown,
): Result<FyndInfoResponse & { router_address: `0x${string}` }, SwapErrorRight> => {
  if (
    !isRecord(value) ||
    value.chain_id !== FYND_ETHEREUM_CHAIN_ID ||
    typeof value.router_address !== 'string' ||
    !isAddress(value.router_address) ||
    (value.permit2_address !== null &&
      (typeof value.permit2_address !== 'string' || !isAddress(value.permit2_address))) ||
    typeof value.version !== 'string'
  ) {
    return Err(makeInvalidResponseError('Fynd returned invalid Ethereum router information'))
  }
  return Ok(value as FyndInfoResponse & { router_address: `0x${string}` })
}

export const validateFyndQuoteResponse = (
  value: unknown,
  quoteOrRate: 'quote' | 'rate',
): Result<
  FyndQuoteResponse & { orders: [FyndOrderQuote, ...FyndOrderQuote[]] },
  SwapErrorRight
> => {
  if (
    !isRecord(value) ||
    !isUnknownArray(value.orders) ||
    value.orders.length === 0 ||
    !value.orders.every((order: unknown) => isValidOrder(order, quoteOrRate)) ||
    typeof value.solve_time_ms !== 'number' ||
    !Number.isFinite(value.solve_time_ms) ||
    value.solve_time_ms < 0 ||
    !isNonNegativeNumericString(value.total_gas_estimate)
  ) {
    return Err(makeInvalidResponseError('Fynd returned an invalid quote response'))
  }
  return Ok(value as FyndQuoteResponse & { orders: [FyndOrderQuote, ...FyndOrderQuote[]] })
}
