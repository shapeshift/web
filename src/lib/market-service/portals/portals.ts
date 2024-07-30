import type { ChainId } from '@shapeshiftoss/caip'
import {
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
import dayjs from 'dayjs'
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
    // TODO(gomes): guard against native AssetIds or support gracefully
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
    // TODO(gomes): guard against native AssetIds or support gracefully
    const { chainId, assetReference } = fromAssetId(assetId)
    const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

    if (!network) {
      console.error(`Unsupported chainId: ${chainId}`)
      return []
    }

    const id = `${network}:${assetReference}`
    const { start, end } = getTimeFrameBounds(timeframe)

    const resolution = (() => {
      switch (timeframe) {
        case HistoryTimeframe.HOUR:
        case HistoryTimeframe.DAY:
          return '15m'
        case HistoryTimeframe.WEEK:
          return '1h'
        case HistoryTimeframe.MONTH:
          return '4h'
        case HistoryTimeframe.YEAR:
        case HistoryTimeframe.ALL:
          return '1d'
        default:
          assertUnreachable(timeframe)
      }
    })()

    try {
      const from =
        // Portals can only get historical market data up to 1 year ago
        timeframe === HistoryTimeframe.ALL
          ? dayjs().startOf('minute').subtract(1, 'year')
          : Math.floor(start.valueOf() / 1000)
      const to = Math.floor(end.valueOf() / 1000)
      const url = `${this.baseUrl}/v2/tokens/history`

      const params = {
        id,
        from,
        to,
        resolution,
      }

      const { data } = await axios.get<HistoryResponse>(url, {
        headers: {
          Authorization: `Bearer ${PORTALS_API_KEY}`,
        },
        params,
      })

      return data.history.reverse().reduce<HistoryData[]>((acc, current) => {
        const date = new Date(current.time).getTime()
        if (!isValidDate(date)) {
          console.error('PortalsMarketService(findPriceHistoryByAssetId): invalid date')
          return acc
        }

        const price = bn(current.closePrice)
        if (price.isNaN()) {
          console.error('PortalsMarketService(findPriceHistoryByAssetId): invalid price')
          return acc
        }

        acc.push({ date, price: price.toNumber() })
        return acc
      }, [])
    } catch (err) {
      console.error(err)
      throw new Error(
        'PortalsMarketService(findPriceHistoryByAssetId): error fetching price history',
      )
    }
  }
}
