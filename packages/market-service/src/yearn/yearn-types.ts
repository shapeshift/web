type Strategy = {
  address: string
  name: string
}
export type YearnMarketCap = {
  inception: number
  address: string
  symbol: string
  name: string
  display_name: string
  icon: string
  token: {
    name: string
    symbol: string
    address: string
    decimals: number
    display_name: string
    icon: string
  }
  tvl: {
    total_assets: number
    price: number
    tvl: number
  }
  apy: {
    type: string
    gross_apr: number
    net_apy: number
    fees: {
      performance: number | null
      withdrawal: number | null
      management: number | null
      keep_crv: number | null
      cvx_keep_crv: number | null
    }
    points: null | {
      week_ago: number | null
      month_ago: number | null
      inception: number | null
    }
    composite: null
  }
  strategies: Strategy[]
  endorsed: boolean
  version: string
  decimals: number
  type: string
  emergency_shutdown: boolean
  updated: number
  migration: null | {
    available: boolean
    address: string
  }
}

type VaultDayDatum = {
  pricePerShare: string
  timestamp: string
  tokenPriceUSDC: string
}

type VaultPosition = {
  vault: {
    vaultDayData: VaultDayDatum[]
  }
}

export type VaultDayDataGQLResponse = {
  data: {
    account: {
      vaultPositions: VaultPosition[]
    }
  }
}
