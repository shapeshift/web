import { BigNumber, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { FyndEncodedQuote, FyndFeeBreakdown } from '../types'
import type { FyndSupportedChainId } from './constants'
import { FYND_CHAINS } from './constants'

type FyndQuoteValidationContext = {
  chainId: FyndSupportedChainId
  sellAmountCryptoBaseUnit: string
  isNativeSell: boolean
  slippageTolerancePercentageDecimal: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNullish = (value: unknown): value is null | undefined =>
  value === null || value === undefined

const MAX_UINT256 = (2n ** 256n - 1n).toString()
export const isFyndAmount = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{1,78}$/.test(value) && bn(value).lte(MAX_UINT256)

const invalidResponse = (message: string, details?: unknown): SwapErrorRight =>
  makeSwapErrorRight({ message, details, code: TradeQuoteError.InvalidResponse })

const isValidFeeBreakdown = (value: unknown): value is FyndFeeBreakdown =>
  isRecord(value) &&
  isFyndAmount(value.router_fee) &&
  isFyndAmount(value.client_fee) &&
  isFyndAmount(value.max_slippage) &&
  isFyndAmount(value.min_amount_received)

const getFailedStatusError = (status: unknown): SwapErrorRight =>
  makeSwapErrorRight({
    message: `Fynd quote failed: ${String(status)}`,
    code:
      status === 'no_route_found' || status === 'insufficient_liquidity'
        ? TradeQuoteError.NoRouteFound
        : TradeQuoteError.QueryFailed,
  })

const getAmountsError = (
  order: Record<string, unknown>,
  { sellAmountCryptoBaseUnit }: FyndQuoteValidationContext,
): SwapErrorRight | undefined => {
  const isValid =
    isFyndAmount(order.amount_in) &&
    bn(order.amount_in).eq(sellAmountCryptoBaseUnit) &&
    isFyndAmount(order.amount_out) &&
    bn(order.amount_out).gt(0) &&
    isFyndAmount(order.gas_estimate) &&
    bn(order.gas_estimate).gt(0) &&
    (isNullish(order.gas_price) || isFyndAmount(order.gas_price)) &&
    (isNullish(order.price_impact_bps) || Number.isSafeInteger(order.price_impact_bps))
  if (isValid) return
  return invalidResponse('Fynd returned invalid quote amounts', {
    amountIn: order.amount_in,
    expectedAmountIn: sellAmountCryptoBaseUnit,
    amountOut: order.amount_out,
    gasEstimate: order.gas_estimate,
    gasPrice: order.gas_price,
    priceImpactBps: order.price_impact_bps,
  })
}

const getFeeBreakdownError = (order: Record<string, unknown>): SwapErrorRight | undefined => {
  const fees = order.fee_breakdown
  if (!isValidFeeBreakdown(fees)) {
    return invalidResponse('Fynd returned a malformed fee breakdown', { feeBreakdown: fees })
  }
  if (!bn(fees.client_fee).isZero()) {
    return invalidResponse('Fynd returned an unexpected client fee', { clientFee: fees.client_fee })
  }
  const feeBreakdownTotal = bn(fees.router_fee)
    .plus(fees.client_fee)
    .plus(fees.max_slippage)
    .plus(fees.min_amount_received)
  const addsUp = isFyndAmount(order.amount_out) && feeBreakdownTotal.eq(order.amount_out)
  if (addsUp && bn(fees.min_amount_received).gt(0)) return
  return invalidResponse('Fynd fee breakdown does not add up to the quoted output', {
    amountOut: order.amount_out,
    feeBreakdown: fees,
  })
}

const getTransactionError = (
  transaction: unknown,
  { chainId, sellAmountCryptoBaseUnit, isNativeSell }: FyndQuoteValidationContext,
): SwapErrorRight | undefined => {
  if (!isRecord(transaction)) {
    return invalidResponse('Fynd quote is missing its transaction')
  }
  const pinnedRouter = FYND_CHAINS[chainId].routerAddress
  if (typeof transaction.to !== 'string' || transaction.to.toLowerCase() !== pinnedRouter) {
    return invalidResponse(
      `Fynd router ${String(
        transaction.to,
      )} is not the pinned router ${pinnedRouter} for ${chainId}`,
      { chainId, router: transaction.to, pinnedRouter },
    )
  }
  const expectedValue = isNativeSell ? sellAmountCryptoBaseUnit : '0'
  const hasCalldata =
    typeof transaction.data === 'string' && /^0x(?:[a-fA-F0-9]{2}){4,}$/.test(transaction.data)
  const isValid =
    hasCalldata &&
    isFyndAmount(transaction.value) &&
    bn(transaction.value).eq(expectedValue) &&
    isNullish(transaction.client_fee_signature_offset)
  if (isValid) return
  return invalidResponse('Fynd returned an invalid transaction', {
    value: transaction.value,
    expectedValue,
    hasCalldata,
    clientFeeSignatureOffset: transaction.client_fee_signature_offset,
  })
}

const getRouteError = (route: unknown): SwapErrorRight | undefined => {
  if (isNullish(route)) return
  const isValid =
    isRecord(route) &&
    Array.isArray(route.swaps) &&
    route.swaps.every((swap: unknown) => isRecord(swap) && typeof swap.protocol === 'string')
  if (isValid) return
  return invalidResponse('Fynd returned a malformed route', { route })
}

// Fynd quantizes slippage to six decimals, then floors the deduction from net output.
const getSlippageError = (
  quote: FyndEncodedQuote,
  slippageTolerancePercentageDecimal: string,
): SwapErrorRight | undefined => {
  const fees = quote.fee_breakdown
  const netAmount = bn(quote.amount_out).minus(fees.router_fee).minus(fees.client_fee)
  const slippageMillionths = bn(slippageTolerancePercentageDecimal)
    .times(1_000_000)
    .integerValue(BigNumber.ROUND_DOWN)
  const allowedMaxSlippage = netAmount
    .times(slippageMillionths)
    .div(1_000_000)
    .integerValue(BigNumber.ROUND_DOWN)
  if (bn(fees.max_slippage).lte(allowedMaxSlippage)) return
  return invalidResponse('Fynd slippage exceeds the requested tolerance', {
    maxSlippage: fees.max_slippage,
    allowedMaxSlippage: allowedMaxSlippage.toFixed(),
    slippageTolerancePercentageDecimal,
  })
}

export const validateFyndQuoteResponse = (
  value: unknown,
  context: FyndQuoteValidationContext,
): Result<FyndEncodedQuote, SwapErrorRight> => {
  if (!isRecord(value) || !Array.isArray(value.orders) || value.orders.length !== 1) {
    return Err(invalidResponse('Fynd must return exactly one order'))
  }
  const order: unknown = value.orders[0]
  if (!isRecord(order)) return Err(invalidResponse('Fynd returned an invalid order'))
  if (order.status !== 'success') return Err(getFailedStatusError(order.status))

  const responseError =
    getAmountsError(order, context) ??
    getFeeBreakdownError(order) ??
    getTransactionError(order.transaction, context) ??
    getRouteError(order.route)
  if (responseError) return Err(responseError)

  const quote = order as FyndEncodedQuote
  const slippageError = getSlippageError(quote, context.slippageTolerancePercentageDecimal)
  if (slippageError) return Err(slippageError)
  return Ok(quote)
}
