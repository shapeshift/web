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
