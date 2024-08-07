export type ZerionMarketData = {
  price: number | null
  total_supply: number | null
  circulating_supply: number | null
  fully_diluted_valuation: number | null
  market_cap: number | null
  changes: {
    percent_1d: number | null
    percent_30d: number | null
    percent_90d: number | null
    pecent_365d: number | null
  }
}

export type ZerionFungibles = {
  data: {
    attributes: {
      market_data: ZerionMarketData
    }
  }
}

export type ZerionChartResponse = {
  links: {
    self: string
  }
  data: {
    type: string
    id: string
    attributes: {
      begin_at: string
      end_at: string
      stats: {
        first: number | null
        min: number | null
        avg: number | null
        max: number | null
        last: number | null
      }
      points: [number, number][]
    }
  }
}
