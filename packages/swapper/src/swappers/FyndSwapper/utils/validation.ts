import { BigNumber, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { FyndEncodedQuote, FyndQuoteResponse } from '../types'
import type { FyndSupportedChainId } from './constants'
import { FYND_CHAINS, FYND_CLIENT_FEE_SHARE, FYND_CLIENT_FEE_SIGNATURE_BYTES } from './constants'

type FyndQuoteContext = {
  chainId: FyndSupportedChainId
  sellAmountCryptoBaseUnit: string
  isNativeSell: boolean
  slippageTolerancePercentageDecimal: string
  clientFeeBps: number
}

const invalidResponse = (message: string, details?: unknown): SwapErrorRight =>
  makeSwapErrorRight({ message, details, code: TradeQuoteError.InvalidResponse })

const getFailedStatusError = (status: string): SwapErrorRight =>
  makeSwapErrorRight({
    message: `Fynd quote failed: ${status}`,
    code:
      status === 'no_route_found' || status === 'insufficient_liquidity'
        ? TradeQuoteError.NoRouteFound
        : TradeQuoteError.QueryFailed,
  })

const getQuoteError = (
  quote: FyndEncodedQuote,
  {
    chainId,
    sellAmountCryptoBaseUnit,
    isNativeSell,
    slippageTolerancePercentageDecimal,
    clientFeeBps,
  }: FyndQuoteContext,
): SwapErrorRight | undefined => {
  const { transaction, fee_breakdown: fees } = quote
  const pinnedRouter = FYND_CHAINS[chainId].routerAddress

  if (transaction.to.toLowerCase() !== pinnedRouter) {
    return invalidResponse(
      `Fynd router ${transaction.to} is not the pinned router ${pinnedRouter} for ${chainId}`,
    )
  }
  if (!bn(quote.amount_in).eq(sellAmountCryptoBaseUnit)) {
    return invalidResponse('Fynd quoted a different sell amount', {
      amountIn: quote.amount_in,
      sellAmountCryptoBaseUnit,
    })
  }
  const expectedValue = isNativeSell ? sellAmountCryptoBaseUnit : '0'
  if (!bn(transaction.value).eq(expectedValue)) {
    return invalidResponse('Fynd transaction value does not match the sell amount', {
      value: transaction.value,
      expectedValue,
    })
  }

  // The router enforces min_amount_received, which may not be looser than the requested slippage
  const netOutput = bn(quote.amount_out).minus(fees.router_fee).minus(fees.client_fee)
  const outputFloor = netOutput
    .times(bn(1).minus(slippageTolerancePercentageDecimal))
    .integerValue(BigNumber.ROUND_DOWN)
  if (bn(fees.min_amount_received).lt(outputFloor)) {
    return invalidResponse('Fynd output floor is below the requested slippage', {
      minAmountReceived: fees.min_amount_received,
      outputFloor: outputFloor.toFixed(),
      slippageTolerancePercentageDecimal,
    })
  }

  if (clientFeeBps === 0) {
    if (!bn(fees.client_fee).isZero()) {
      return invalidResponse('Fynd returned an unexpected client fee', {
        clientFee: fees.client_fee,
      })
    }
    return
  }

  // Our share of the gross client fee, allowing one unit of rounding
  const minClientFee = bn(quote.amount_out)
    .times(clientFeeBps)
    .div(10_000)
    .times(FYND_CLIENT_FEE_SHARE)
    .integerValue(BigNumber.ROUND_DOWN)
    .minus(1)
  if (bn(fees.client_fee).lt(minClientFee)) {
    return invalidResponse('Fynd client fee is below the requested share', {
      clientFee: fees.client_fee,
      amountOut: quote.amount_out,
      clientFeeBps,
    })
  }
  // The proxy patches the signature over Fynd's zeroed placeholder at the reported offset
  const offset = transaction.client_fee_signature_offset
  const signature =
    offset === null || offset === undefined
      ? ''
      : transaction.data.slice(2 + offset * 2, 2 + (offset + FYND_CLIENT_FEE_SIGNATURE_BYTES) * 2)
  if (signature.length !== FYND_CLIENT_FEE_SIGNATURE_BYTES * 2 || /^0+$/.test(signature)) {
    return invalidResponse('Fynd quote is not signed for the client fee', { offset })
  }
  if (!quote.client_fee_deadline) {
    return invalidResponse('Fynd quote is missing its client fee deadline')
  }
}

export const validateFyndQuoteResponse = (
  response: FyndQuoteResponse,
  context: FyndQuoteContext,
): Result<FyndEncodedQuote, SwapErrorRight> => {
  const order = response.orders[0]
  if (!order) return Err(invalidResponse('Fynd returned no order'))
  if (order.status !== 'success') return Err(getFailedStatusError(order.status))

  const error = getQuoteError(order, context)
  return error ? Err(error) : Ok(order)
}
