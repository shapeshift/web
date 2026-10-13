import type { Address, Hex } from 'viem'

import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type FyndTradeQuoteInput = GetEvmTradeQuoteInput
export type FyndTradeRateInput = GetEvmTradeRateInput

export type FyndTransaction = {
  to: Address
  value: string
  data: Hex
  client_fee_signature_offset?: number | null
}

export type FyndFeeBreakdown = {
  router_fee: string
  client_fee: string
  max_slippage: string
  min_amount_received: string
}

export type FyndErrorResponse = {
  error: string
  code: string
}

export type FyndEncodedQuote = {
  status: 'success'
  amount_in: string
  amount_out: string
  gas_estimate: string
  route?: { swaps: { protocol: string }[] } | null
  transaction: FyndTransaction
  fee_breakdown: FyndFeeBreakdown
  // Unix seconds; set by the proxy when it signs the client fee
  client_fee_deadline?: number | null
}

export type FyndFailedOrder = {
  status:
    | 'no_route_found'
    | 'insufficient_liquidity'
    | 'timeout'
    | 'not_ready'
    | 'price_check_failed'
    | 'encoding_failed'
}

export type FyndQuoteResponse = {
  orders: (FyndEncodedQuote | FyndFailedOrder)[]
}
