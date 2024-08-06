export type ZerionMarketData = {
  price: number
  total_supply: number
  circulating_supply: number
  fully_diluted_valuation: number
  market_cap: number
  changes: {
    percent_1d: number
    percent_30d: number
    percent_90d: number
    pecent_365d: number
  }
}

export type ZerionFungibles = {
  data: {
    attributes: {
      market_data: ZerionMarketData
    }
  }
}
