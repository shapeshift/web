import type { Address, Hex } from 'viem'

import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type LcxLibertyTradeQuoteInput = GetEvmTradeQuoteInput
export type LcxLibertyTradeRateInput = GetEvmTradeRateInput

export type LcxLibertyErrorResponse = {
  success: false
  code: string
  message: string
}

export type LcxLibertyQuote = {
  quoteId: string
  chainId: number
  input: { token: Address; amount: string }
  output: { token: Address; amount: string; minimumAmount: string }
  fee: { bps: number; amount: string }
  // Native base units at the provider's gas price, null while that price is unknown
  gasEstimateWei: string | null
  slippageBps: number
  spender: Address | null
}

export type LcxLibertyQuoteResponse = {
  success: true
  data: { quote: LcxLibertyQuote }
}

export type LcxLibertySwapTransaction = {
  chainId: number
  to: Address
  data: Hex
  value: string
  gas?: string | null
}

export type LcxLibertyBuildResponse = {
  success: true
  // swap is null when the router is not deployed on the chain
  data: { swap: LcxLibertySwapTransaction | null }
}
