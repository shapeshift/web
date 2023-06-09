export type OsmosisMarketCap = {
  price: number
  denom: string
  symbol: string
  liquidity: number
  liquidity_24h_change: number
  volume_24h: number
  volume_24h_change: number
  name: string
  price_24h_change: number
}

export type OsmosisHistoryData = {
  time: number
  close: number
  high: number
  low: number
  open: number
  volume: number
}

export type OsmosisMarketData = {
  symbol: string
  amount: number
  denom: string
  coingecko_id: string
  liquidity: number
  liquidity_24h_change: number
  volume_24h: number
  volume_24h_change: number
  price: number
  price_24h_change: number
  fees: string
}

export type OsmosisToken = {
  denom: string
  amount: string
}

export type OsmosisPoolAsset = {
  token: OsmosisToken
  weight: string
}

export type OsmosisPool = {
  '@type': string
  name: string
  address: string
  id: string
  pool_params: {
    swap_fee: string
    exit_fee: string
    smooth_weight_change_params: boolean
  }
  future_pool_governor: string
  total_shares: {
    denom: string
    amount: string
  }
  pool_assets: OsmosisPoolAsset[]
  total_weight: string
  apy: string
  tvl: string
}
