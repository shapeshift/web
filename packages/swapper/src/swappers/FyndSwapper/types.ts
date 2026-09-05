import type { Address, Hex } from 'viem'

import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type FyndTradeQuoteInput = GetEvmTradeQuoteInput
export type FyndTradeRateInput = GetEvmTradeRateInput

export type FyndQuoteStatus =
  | 'success'
  | 'no_route_found'
  | 'insufficient_liquidity'
  | 'timeout'
  | 'not_ready'
  | 'price_check_failed'

export type FyndTransaction = {
  to: Address
  value: string
  data: Hex
  client_fee_signature_offset: number | null
}

export type FyndFeeBreakdown = {
  router_fee: string
  client_fee: string
  max_slippage: string
  min_amount_received: string
  swaps_hash: string | null
}

export type FyndOrderQuote = {
  order_id: string
  status: FyndQuoteStatus
  amount_in: string
  amount_out: string
  amount_out_net_gas: string
  gas_estimate: string
  gas_price: string | null
  price_impact_bps: number | null
  route: {
    swaps: {
      protocol: string
    }[]
  } | null
  transaction: FyndTransaction | null
  fee_breakdown: FyndFeeBreakdown | null
}

export type FyndQuoteResponse = {
  orders: FyndOrderQuote[]
  total_gas_estimate: string
  solve_time_ms: number
}

export type FyndInfoResponse = {
  chain_id: number
  router_address: Address | null
  permit2_address: Address | null
  version: string
}
