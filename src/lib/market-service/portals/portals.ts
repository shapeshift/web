import type { ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import dayjs from 'dayjs'
import { zeroAddress } from 'viem'

import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import { isValidDate } from '../utils/isValidDate'

import { getConfig } from '@/config'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAIN_ID_TO_PORTALS_NETWORK } from '@/lib/portals/constants'
import type { GetTokensResponse, HistoryResponse } from '@/lib/portals/types'
import { assertUnreachable, getStableTimestamp, getTimeFrameBounds } from '@/lib/utils'

const calculatePercentChange = (openPrice: string, closePrice: string): number => {
  const open = bnOrZero(openPrice)
  const close = bnOrZero(closePrice)
  if (open.isZero()) return 0
  return close.minus(open).dividedBy(open).times(100).toNumber()
}

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

export class PortalsMarketService implements MarketService {
  baseUrl = getConfig().VITE_PORTALS_BASE_URL

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 250,
  }

  async findAll(args?: FindAllMarketArgs): Promise<MarketCapResult> {
    const { count } = { ...this.defaultGetByMarketCapArgs, ...args }

    const marketCapResult: MarketCapResult = {}

    try {
      await Promise.all(
        Object.entries(CHAIN_ID_TO_PORTALS_NETWORK).map(async ([chainId, network]) => {
          if (Object.keys(marketCapResult).length >= count) return

          const { data } = await axios.get<GetTokensResponse>(`${this.baseUrl}/v2/tokens`, {
            params: {
              limit: Math.min(this.defaultGetByMarketCapArgs.count, count),
              minLiquidity: '100000',
              sortBy: 'volumeUsd7d',
              networks: [network],
              // Only fetch a single page for each chain, to avoid Avalanche/Ethereum assets eating all the 1000 count passed by web
              page: '0',
            },
            paramsSerializer: { indexes: null },
          })

          for (const token of data.tokens) {
            if (Object.keys(marketCapResult).length >= count) break

            const assetId = toAssetId({
              chainId: chainId as ChainId,
              assetNamespace:
                chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
              assetReference: token.address,
            })

            marketCapResult[assetId] = {
              price: bnOrZero(token.price).toFixed(),
              marketCap: '0',
              volume: '0',
              changePercent24Hr: 0,
              supply: undefined, // This endpoint doesn't provide supply
              maxSupply: undefined, // This endpoint doesn't provide max supply
            }

            if (Object.keys(marketCapResult).length >= count) break
          }
        }),
      )

      return marketCapResult
    } catch (e) {
      console.error('Error fetching Portals data:', e)
      return marketCapResult
    }
  }
  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      const { chainId, assetReference } = fromAssetId(assetId)

      const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]
      if (!network) return null

      const { data } = await axios.get<HistoryResponse>(`${this.baseUrl}/v2/tokens/history`, {
        params: {
          id: `${network}:${isToken(assetId) ? assetReference : zeroAddress}`,
          from: dayjs(getStableTimestamp(5)).subtract(24, 'hours').unix(),
          resolution: '1d',
          page: 0,
        },
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
    const { chainId, assetReference } = fromAssetId(assetId)
    const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

    if (!network) return []

    const { start: _start, end } = getTimeFrameBounds(timeframe, 5)

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
      // Portals can only get historical market data up to 1 year ago
      const start =
        timeframe === HistoryTimeframe.ALL
          ? dayjs(getStableTimestamp(5)).subtract(1, 'year')
          : _start

      const { data } = await axios.get<HistoryResponse>(`${this.baseUrl}/v2/tokens/history`, {
        params: {
          id: `${network}:${isToken(assetId) ? assetReference : zeroAddress}`,
          from: Math.floor(start.valueOf() / 1000),
          to: Math.floor(end.valueOf() / 1000),
          resolution,
        },
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
