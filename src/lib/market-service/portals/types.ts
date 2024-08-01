export type TokenInfo = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images: string[] | undefined
  pricePerShare: string | undefined
}

export type GetTokensResponse = {
  totalItems: number
  pageItems: number
  more: boolean
  page: number
  tokens: TokenInfo[]
}

export type HistoryResponse = {
  totalItems: number
  pageItems: number
  more: boolean
  page: number
  history: {
    time: string
    highPrice: string
    lowPrice: string
    openPrice: string
    closePrice: string
    liquidity: string
    reserves: string[]
    totalSupply: string
    pricePerShare: string
    volume1dUsd: string
    apy: string
  }[]
}
