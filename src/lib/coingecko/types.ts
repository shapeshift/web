import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type {
  CoinGeckoMarketCap,
  CoinGeckoMarketData,
} from 'lib/market-service/coingecko/coingecko-types'

// Non-exhaustive types, refer to https://docs.coingecko.com/reference/coins-id and other endpoints for full response schema
export type CoingeckoAssetDetails = {
  market_data: CoinGeckoMarketData
  asset_platform_id: string
  id: string
  image: Record<string, string>
  name: string
  symbol: string
  detail_platforms: Record<string, { decimal_place: number; contract_address: string }>
  platforms: Record<string, string>
}

export type MoverAsset = Pick<
  CoinGeckoMarketCap,
  'id' | 'symbol' | 'name' | 'image' | 'market_cap_rank'
> & {
  usd: string
  usd_24h_vol: string
  usd_1y_change: string
}

export type MoversResponse = {
  top_gainers: MoverAsset[]
  top_losers: MoverAsset[]
}

// Non-exhaustive
export type TrendingCoin = {
  id: string
  coin_id: number
  name: string
  symbol: string
  market_cap_rank: number
  thumb: string
  small: string
  large: string
  slug: string
  price_btc: number
  score: number
  data: {
    price: number
    price_btc: string
    price_change_percentage_24h: Record<string, number>
    market_cap: string
    market_cap_btc: string
    total_volume: string
  }
}

export type TrendingResponse = {
  coins: {
    item: TrendingCoin
  }[]
}

export type RecentlyAddedCoin = {
  id: string
  symbol: string
  name: string
  activated_at: number
}

export type RecentlyAddedResponse = RecentlyAddedCoin[]

export type CoingeckoAsset = {
  assetId: AssetId
  details: CoingeckoAssetDetails
}

export type CoingeckoList = {
  byId: Record<AssetId, CoingeckoAsset>
  ids: AssetId[]
  chainIds: ChainId[]
}
