export type CoinGeckoMarketData = {
  current_price: Record<string, number>
  market_cap: Record<string, number>
  total_volume?: Record<string, number>
  high_24h?: Record<string, number>
  low_24h?: Record<string, number>
  circulating_supply: number
  total_supply?: number
  max_supply: number
  price_change_percentage_24h: number
}

export type CoinGeckoMarketCap = {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  fully_diluted_valuation: number | null
  total_volume: number
  high_24h: number
  low_24h: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap_change_24h: number
  market_cap_change_percentage_24h: number
  circulating_supply: number
  total_supply: number | null
  max_supply: number | null
  ath: number
  ath_change_percentage: number
  ath_date: string
  atl: number
  atl_change_percentage: number
  atl_date: string
  roi: null | {
    times: number
    currency: string
    percentage: number
  }
  last_updated: string
  market_data?: CoinGeckoMarketData
}
