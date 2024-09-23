import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import type {
  CoinGeckoMarketCap,
  CoinGeckoMarketData,
} from 'lib/market-service/coingecko/coingecko-types'

import {
  COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID,
  COINGECKO_PLATFORM_ID_TO_CHAIN_ID,
} from './constants'

const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'

// TODO(gomes): move me to type utils before opening PR
// Non-exhaustive types, refer to https://docs.coingecko.com/reference/coins-id and other endpoints for full response schema
type CoingeckoAssetDetails = {
  market_data: CoinGeckoMarketData
  asset_platform_id: string
  id: string
  image: Record<string, string>
  name: string
  symbol: string
  detail_platforms: Record<string, { decimal_place: number; contract_address: string }>
  platforms: Record<string, string>
}

type MoverAsset = Pick<
  CoinGeckoMarketCap,
  'id' | 'symbol' | 'name' | 'image' | 'market_cap_rank'
> & {
  usd: string
  usd_24h_vol: string
  usd_1y_change: string
  assetId: AssetId
  details: CoingeckoAssetDetails
}

type MoversResponse = {
  top_gainers: MoverAsset[]
  top_losers: MoverAsset[]
}

// Non-exhaustive
type TrendingCoin = {
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
} & {
  assetId: AssetId
  details: CoingeckoAssetDetails
}

type TrendingResponse = {
  coins: {
    item: TrendingCoin
  }[]
}

type RecentlyAddedCoin = {
  id: string
  symbol: string
  name: string
  activated_at: number
} & {
  assetId: AssetId
  details: CoingeckoAssetDetails
}

type RecentlyAddedResponse = RecentlyAddedCoin[]

export type CoingeckoAsset = {
  assetId: AssetId
  details: CoingeckoAssetDetails
}

export type CoingeckoList = {
  byId: Record<AssetId, CoingeckoAsset>
  ids: AssetId[]
  chainIds: ChainId[]
}

export const getCoingeckoTopMovers = async (): Promise<CoingeckoAsset[]> => {
  const { data } = await axios.get<MoversResponse>(
    `${coingeckoBaseUrl}/coins/top_gainers_losers?vs_currency=usd`,
  )

  const all: CoingeckoAsset[] = []

  await Promise.allSettled(
    data.top_gainers.concat(data.top_losers).map(async (topMover, i) => {
      try {
        const { data } = await axios.get<CoingeckoAssetDetails>(
          `${coingeckoBaseUrl}/coins/${topMover.id}`,
        )
        const { asset_platform_id, id } = data

        const address = data.platforms?.[asset_platform_id]

        const assetId = (() => {
          // Handles native assets, which *may* not contain a platform_id
          if (COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id])
            return COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id]

          const chainId = COINGECKO_PLATFORM_ID_TO_CHAIN_ID[asset_platform_id]
          if (!chainId) return

          const assetId = toAssetId({
            chainId,
            assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
            assetReference: address,
          })
          return assetId
        })()

        if (!assetId) return topMover

        all[i] = {
          ...topMover,
          assetId,
          details: data,
        }
      } catch (error) {
        console.error(`Error fetching asset details for ${topMover.id}:`, error)
        return topMover
      }
    }),
  )

  return all.filter(mover => Boolean(mover.assetId))
}

export const getCoingeckoTrending = async (): Promise<CoingeckoAsset[]> => {
  const { data } = await axios.get<TrendingResponse>(`${coingeckoBaseUrl}/search/trending`)

  const all: CoingeckoAsset[] = []

  await Promise.allSettled(
    data.coins
      .map(({ item }) => item)
      .map(async (coin, i) => {
        try {
          // The trending endpoint contains almost all we'd need... except the platform_id, which we need to build the ChainId/AssetId
          // So we still need to fetch from the /coins/<coin> endpoint :shrugs:
          const { data } = await axios.get<CoingeckoAssetDetails>(
            `${coingeckoBaseUrl}/coins/${coin.id}`,
          )
          const { asset_platform_id, id } = data

          const address = data.platforms?.[asset_platform_id]

          const assetId = (() => {
            // Handles native assets, which *may* not contain a platform_id
            if (COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id])
              return COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id]

            const chainId = COINGECKO_PLATFORM_ID_TO_CHAIN_ID[asset_platform_id]
            if (!chainId) return

            const assetId = toAssetId({
              chainId,
              assetNamespace:
                chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
              assetReference: address,
            })
            return assetId
          })()

          if (!assetId) return coin

          all[i] = {
            ...coin,
            assetId,
            details: data,
          }
        } catch (error) {
          console.error(`Error fetching asset details for ${coin.id}:`, error)
          return coin
        }
      }),
  )

  return all.filter(mover => Boolean(mover.assetId))
}

export const getCoingeckoRecentlyAdded = async (): Promise<CoingeckoAsset[]> => {
  const { data } = await axios.get<RecentlyAddedResponse>(`${coingeckoBaseUrl}/coins/list/new`)

  const all: CoingeckoAsset[] = []

  await Promise.allSettled(
    data.map(async (coin, i) => {
      try {
        const { data } = await axios.get<CoingeckoAssetDetails>(
          `${coingeckoBaseUrl}/coins/${coin.id}`,
        )
        const { asset_platform_id, id } = data

        const address = data.platforms?.[asset_platform_id]

        const assetId = (() => {
          // Handles native assets, which *may* not contain a platform_id
          if (COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id])
            return COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id]

          const chainId = COINGECKO_PLATFORM_ID_TO_CHAIN_ID[asset_platform_id]
          if (!chainId) return

          const assetId = toAssetId({
            chainId,
            assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
            assetReference: address,
          })
          return assetId
        })()

        if (!assetId) return coin

        all[i] = {
          assetId,
          details: data,
        }
      } catch (error) {
        console.error(`Error fetching asset details for ${coin.id}:`, error)
        return null
      }
    }),
  )

  return all.filter(mover => Boolean(mover.assetId))
}
