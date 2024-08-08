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

type ChartRelationship = {
  links: {
    related: string
  }
  data: {
    type: string
    id: string
  }
}

export type ListFungiblesResponse = {
  links: {
    self: string
    first: string
    next: string
    prev: string
  }
  data: {
    type: string
    id: string
    attributes: {
      name: string
      symbol: string
      description: string
      icon: {
        url: string
      }
      flags: {
        verified: boolean
      }
      external_links: {
        type: string
        name: string
        url: string
      }[]
      implementations: {
        chain_id: string
        address: string
        decimals: number
      }[]
      market_data: ZerionMarketData
    }
    relationships: {
      chart_hour: ChartRelationship
      chart_day: ChartRelationship
      chart_week: ChartRelationship
      chart_month: ChartRelationship
      chart_year: ChartRelationship
      chart_max: ChartRelationship
    }
  }[]
}
