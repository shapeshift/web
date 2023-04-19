
export type OneInchQuoteApiInput = {
    fromTokenAddress: string
    toTokenAddress: string
    amount: string
}

export type OneInchTokenResponse = {
    symbol: string
    name: string
    address: string
    decimals: number
    logoURI: string
}

export type OneInchQuoteResponse = {
  fromToken: OneInchTokenResponse
  toToken: OneInchTokenResponse
  toTokenAmount: string
  fromTokenAmount: string
  estimatedGas: string
}   


export type OneInchSwapperDeps = {
  apiUrl: string
}