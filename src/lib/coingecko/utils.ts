import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import type { CoinGeckoMarketCap } from 'lib/market-service/coingecko/coingecko-types'

import {
  COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID,
  COINGECKO_PLATFORM_ID_TO_CHAIN_ID,
} from './constants'
import type {
  CoingeckoAsset,
  CoingeckoAssetDetails,
  MoverAsset,
  MoversResponse,
  RecentlyAddedCoin,
  RecentlyAddedResponse,
  TrendingCoin,
  TrendingResponse,
} from './types'

const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'

const getCoinDetails = async (
  marketCap: CoinGeckoMarketCap | RecentlyAddedCoin | TrendingCoin | MoverAsset,
  i: number,
  all: CoingeckoAsset[],
) => {
  try {
    const { data } = await queryClient.fetchQuery({
      queryKey: ['coingecko', 'coin', marketCap.id],
      // Shared query across consumers, so make it infinite as there will be a lot of overlap
      queryFn: () => axios.get<CoingeckoAssetDetails>(`${coingeckoBaseUrl}/coins/${marketCap.id}`),
      gcTime: Infinity,
      staleTime: Infinity,
    })
    const { asset_platform_id, id } = data

    const address = data.platforms?.[asset_platform_id]

    if (!address) return

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

    if (!assetId) return marketCap

    all[i] = {
      assetId,
      details: data,
    }
  } catch (error) {
    console.error(`Error fetching asset details for ${marketCap.id}:`, error)
    return null
  }
}

export const getCoingeckoTopMovers = async (): Promise<CoingeckoAsset[]> => {
  const { data } = await axios.get<MoversResponse>(
    `${coingeckoBaseUrl}/coins/top_gainers_losers?vs_currency=usd`,
  )

  const all: CoingeckoAsset[] = []

  await Promise.allSettled(
    data.top_gainers
      .concat(data.top_losers)
      .map((marketData, i) => getCoinDetails(marketData, i, all)),
  )

  return all.filter(mover => Boolean(mover.assetId))
}

export const getCoingeckoTrending = async (): Promise<CoingeckoAsset[]> => {
  const { data } = await axios.get<TrendingResponse>(`${coingeckoBaseUrl}/search/trending`)

  const all: CoingeckoAsset[] = []

  await Promise.allSettled(
    data.coins.map(({ item }) => item).map((marketData, i) => getCoinDetails(marketData, i, all)),
  )

  return all.filter(mover => Boolean(mover.assetId))
}

export const getCoingeckoRecentlyAdded = async (): Promise<CoingeckoAsset[]> => {
  const { data } = await axios.get<RecentlyAddedResponse>(`${coingeckoBaseUrl}/coins/list/new`)

  const all: CoingeckoAsset[] = []

  await Promise.allSettled(data.map((marketData, i) => getCoinDetails(marketData, i, all)))

  return all.filter(mover => Boolean(mover.assetId))
}

export const getCoingeckoMarkets = async (
  order: 'market_cap_desc' | 'volume_desc',
): Promise<CoingeckoAsset[]> => {
  const { data } = await axios.get<CoinGeckoMarketCap[]>(
    `${coingeckoBaseUrl}/coins/markets?vs_currency=usd&order=${order}`,
  )

  const all: CoingeckoAsset[] = []

  await Promise.allSettled(data.map((marketData, i) => getCoinDetails(marketData, i, all)))

  return all.filter(mover => Boolean(mover.assetId))
}
