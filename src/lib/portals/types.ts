// Non-exhaustive - https://api.portals.fi/docs#/Supported/SupportedController_getSupportedTokensV2 for full docs
export type TokenInfo = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images: string[] | undefined
  image: string | undefined
  price: string | undefined
  pricePerShare: string | undefined
  platform: string
  network: string
  liquidity: number
  metrics: {
    apy?: string
    volumeUsd1d?: string
    volumeUsd7d?: string
  }
  tokens: string[]
}

type Platform = {
  platform: string
  name: string
  image: string
  network: string
}

export type PlatformsById = Record<string, Platform>

export type GetPlatformsResponse = Platform[]

export type GetBalancesResponse = {
  // Not strictly true, this has additional fields, but we're only interested in the token info part
  balances: TokenInfo[]
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
