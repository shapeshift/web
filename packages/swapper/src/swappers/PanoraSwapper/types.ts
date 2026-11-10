import type { GetAptosTradeQuoteInput, GetAptosTradeRateInput } from '../../types'

export type PanoraTradeQuoteInput = GetAptosTradeQuoteInput
export type PanoraTradeRateInput = GetAptosTradeRateInput

export type PanoraSwapRequest = {
  fromTokenAddress: string
  toTokenAddress: string
  fromTokenAmount: string
  toWalletAddress: string
  slippagePercentage: number
  integratorFeePercentage?: number
  integratorFeeAddress?: string
}

export type PanoraToken = {
  address: string
  symbol: string | null
  decimals: number | null
}

export type PanoraQuote = {
  toTokenAmount: string
  minToTokenAmount: string
  feeTokenAmount: string
  rawTransaction: { bcs: string }
}

export type PanoraSwapResponse = {
  fromToken: PanoraToken
  toToken: PanoraToken
  feeToken: PanoraToken
  quotes: PanoraQuote[]
}

export type PanoraErrorResponse = {
  statusCode?: number
  message: string
}
