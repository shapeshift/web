export type PanoraTokenInfo = {
  token_address: string
  name: string
  symbol: string
  decimals: number
  current_price: number | null
}

export type PanoraSwapRequest = {
  fromTokenAddress: string
  toTokenAddress: string
  fromTokenAmount: string
  toWalletAddress: string
  slippagePercentage: number
  integratorFeePercentage?: number
  integratorFeeAddress?: string
}

export type PanoraTxData = {
  function: string
  type_arguments: string[]
  arguments: string[]
}

export type PanoraQuote = {
  toTokenAmount: string
  feeTokenAmount: string
  feePercentage: number
  priceImpact: number
  slippagePercentage: number
  txData: PanoraTxData
}

export type PanoraSwapResponse = {
  fromToken: string
  toToken: string
  feeToken: string
  quotes: PanoraQuote[]
}
