import type { Address, Hex } from 'viem'

import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type FyndTradeQuoteInput = GetEvmTradeQuoteInput
export type FyndTradeRateInput = GetEvmTradeRateInput

export type FyndTransaction = {
  to: Address
  value: string
  data: Hex
}

export type FyndFeeBreakdown = {
  router_fee: string
  client_fee: string
  max_slippage: string
  min_amount_received: string
}

export type FyndEncodedQuote = {
  status: 'success'
  amount_in: string
  amount_out: string
  gas_estimate: string
  gas_price?: string | null
  price_impact_bps?: number | null
  route?: { swaps: { protocol: string }[] } | null
  transaction: FyndTransaction
  fee_breakdown: FyndFeeBreakdown
}
