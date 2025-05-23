import {
  adapters,
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  mayachainChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  thorchainChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId } from '@shapeshiftoss/utils'
import axios from 'axios'

import { COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID } from './constants'
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

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import type { CoinGeckoSortKey } from '@/lib/market-service/coingecko/coingecko'
import type { CoinGeckoMarketCap } from '@/lib/market-service/coingecko/coingecko-types'

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

    // No token address, and not present in our native assets mapping - this is most likely a native asset we don't support
    if (!address && !COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id]) return

    const assetId = (() => {
      // Handles native assets, which *may* not contain a platform_id
      if (COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id])
        return COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID[id]

      const chainId = adapters.coingeckoAssetPlatformToChainId(
        asset_platform_id as adapters.CoingeckoAssetPlatform,
      )
      if (!chainId) return

      const assetNamespace = getAssetNamespaceFromChainId(chainId as KnownChainIds)

      const assetId = toAssetId({
        chainId,
        assetNamespace,
        assetReference: address,
      })
      return assetId
    })()

    if (!assetId) return

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

export const getCoingeckoMarketsRaw = async (
  order: CoinGeckoSortKey,
  page = 1,
  pageSize = 100,
): Promise<CoinGeckoMarketCap[]> => {
  const { data } = await axios.get<CoinGeckoMarketCap[]>(
    `${coingeckoBaseUrl}/coins/markets?vs_currency=usd&order=${order}&per_page=${pageSize}&page=${page}&sparkline=false`,
  )

  return data
}

export const getCoingeckoMarkets = async (
  order: CoinGeckoSortKey,
  page = 1,
  pageSize = 100,
): Promise<CoingeckoAsset[]> => {
  const data = await getCoingeckoMarketsRaw(order, page, pageSize)
  const all: CoingeckoAsset[] = []

  await Promise.allSettled(data.map((marketData, i) => getCoinDetails(marketData, i, all)))

  return all.filter(mover => Boolean(mover.assetId))
}

export const getCoingeckoSupportedChainIds = () => {
  return [
    ethChainId,
    avalancheChainId,
    optimismChainId,
    bscChainId,
    polygonChainId,
    gnosisChainId,
    arbitrumChainId,
    baseChainId,
    cosmosChainId,
    thorchainChainId,
    mayachainChainId,
    btcChainId,
    bchChainId,
    ltcChainId,
    solanaChainId,
    dogeChainId,
    ...(getConfig().VITE_FEATURE_ARBITRUM_NOVA ? [arbitrumNovaChainId] : []),
  ]
}
