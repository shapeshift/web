import type { ChainId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumChainId,
  ASSET_NAMESPACE,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  fromAssetId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type {
  AssetsByIdPartial,
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import qs from 'qs'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { assertUnreachable, getTimeFrameBounds } from 'lib/utils'

import generatedAssetData from '../../asset-service/service/generatedAssetData.json'
import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import { isValidDate } from '../utils/isValidDate'

const calculatePercentChange = (openPrice: string, closePrice: string): number => {
  const open = bnOrZero(openPrice)
  const close = bnOrZero(closePrice)
  if (open.isZero()) return 0
  return close.minus(open).dividedBy(open).times(100).toNumber()
}

// Non-exhaustive - https://api.portals.fi/docs#/Supported/SupportedController_getSupportedTokensV2 for full docs
type TokenInfo = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images: string[] | undefined
  pricePerShare: string | undefined
}

type GetTokensResponse = {
  totalItems: number
  pageItems: number
  more: boolean
  page: number
  tokens: TokenInfo[]
}

type HistoryResponse = {
  totalItems: number
  pageItems: number
  more: boolean
  page: number
  history: {
    time: string
    highPrice: string
    lowPrice: string
    openPrice: string
    closePrice: string
    liquidity: string
    reserves: string[]
    totalSupply: string
    pricePerShare: string
    volume1dUsd: string
    apy: string
  }[]
}

const CHAIN_ID_TO_PORTALS_NETWORK: Partial<Record<ChainId, string>> = {
  [avalancheChainId]: 'avalanche',
  [ethChainId]: 'ethereum',
  [polygonChainId]: 'polygon',
  [bscChainId]: 'bsc',
  [optimismChainId]: 'optimism',
  [arbitrumChainId]: 'arbitrum',
  [gnosisChainId]: 'gnosis',
  [baseChainId]: 'base',
}

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

const PORTALS_API_KEY = process.env.REACT_APP_PORTALS_API_KEY

export class PortalsMarketService implements MarketService {
  baseUrl = 'https://api.portals.fi'

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 250,
  }

  async findAll(args?: FindAllMarketArgs) {
    debugger
    const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
    const { count } = argsToUse
    const url = `${this.baseUrl}/v2/tokens`
    let allTokens: TokenInfo[] = []
    let page = 1
    let hasMore = true

    while (hasMore && allTokens.length < count) {
      const params = {
        limit: '250',
        minLiquidity: '1000',
        minApy: '1',
        networks: ['avalanche'],
        page: page.toString(),
      }

      try {
        const { data } = await axios.get<GetTokensResponse>(url, {
          paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
          headers: {
            Authorization: `Bearer ${PORTALS_API_KEY}`,
          },
          params,
        })

        allTokens = allTokens.concat(data.tokens)
        hasMore = data.more
        page++
      } catch (e) {
        console.error('Error fetching Portals data:', e)
        break
      }
    }

    return allTokens.slice(0, count).reduce((acc, token) => {
      try {
        const assetId = toAssetId({
          chainId: avalancheChainId,
          assetNamespace: ASSET_NAMESPACE.erc20,
          assetReference: token.address,
        })

        if (!assetId) return acc

        acc[assetId] = {
          price: bnOrZero(token.pricePerShare).toFixed(),
          marketCap: '0',
          volume: '0',
          changePercent24Hr: 0,
          // TODO(gomes):
          // marketCap: token.marketCap.toString(),
          // volume: token.volume24h.toString(),
          // changePercent24Hr: token.priceChange24h,
          // supply: token.totalSupply,
          // maxSupply: token.maxSupply?.toString(),
        }

        return acc
      } catch {
        return acc // no AssetId found, we don't support this asset
      }
    }, {} as MarketCapResult)
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    const assets = generatedAssetData as unknown as AssetsByIdPartial

    try {
      const asset = assets[assetId]
      if (!asset) return null
      // TODO(gomes): native assetIds
      const { chainId, assetReference } = fromAssetId(assetId)

      const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]
      if (!network) {
        console.error(`Unsupported chainId: ${chainId}`)
        return null
      }

      const id = `${network}:${assetReference}`
      const url = `${this.baseUrl}/v2/tokens/history`
      const params = {
        id,
        from: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
        resolution: '1d',
        page: 0,
      }

      const { data } = await axios.get<HistoryResponse>(url, {
        headers: {
          Authorization: `Bearer ${PORTALS_API_KEY}`,
        },
        params,
      })

      if (!data.history.length) return null

      const latestData = data.history[0]

      return {
        price: bnOrZero(latestData.closePrice).toFixed(),
        marketCap: bnOrZero(latestData.liquidity).toFixed(),
        volume: latestData.volume1dUsd,
        changePercent24Hr: calculatePercentChange(latestData.openPrice, latestData.closePrice),
        supply: latestData.totalSupply,
        maxSupply: undefined, // This endpoint doesn't provide max supply
      }
    } catch (e) {
      console.error(`MarketService(findByAssetId): error fetching market data: ${e}`)
      return null
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    if (!adapters.assetIdToCoinCap(assetId)) return []
    const id = adapters.assetIdToCoinCap(assetId)

    const { start, end } = getTimeFrameBounds(timeframe)

    const interval = (() => {
      switch (timeframe) {
        case HistoryTimeframe.HOUR:
          return 'm5'
        case HistoryTimeframe.DAY:
          return 'h1'
        case HistoryTimeframe.WEEK:
        case HistoryTimeframe.MONTH:
        case HistoryTimeframe.YEAR:
        case HistoryTimeframe.ALL:
          return 'd1'
        default:
          assertUnreachable(timeframe)
      }
    })()

    try {
      const from = start.valueOf()
      const to = end.valueOf()
      const url = `${this.baseUrl}/assets/${id}/history`
      type CoincapHistoryData = {
        data: {
          priceUsd: number
          time: number
        }[]
      }
      const {
        data: { data: coincapData },
      } = await axios.get<CoincapHistoryData>(
        `${url}?id=${id}&start=${from}&end=${to}&interval=${interval}`,
      )

      return coincapData.reduce<HistoryData[]>((acc, current) => {
        const date = current.time
        if (!isValidDate(date)) {
          console.error('Coincap asset history data has invalid date')
          return acc
        }
        const price = bn(current.priceUsd)
        if (price.isNaN()) {
          console.error('Coincap asset history data has invalid price')
          return acc
        }
        acc.push({
          date,
          price: price.toNumber(),
        })
        return acc
      }, [])
    } catch (e) {
      console.warn(e, '')
      throw new Error('MarketService(findPriceHistoryByAssetId): error fetching price history')
    }
  }
}
