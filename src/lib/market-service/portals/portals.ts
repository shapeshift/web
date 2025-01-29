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
import { createThrottle } from '@shapeshiftoss/utils'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { getConfig } from 'config'
import dayjs from 'dayjs'
import qs from 'qs'
import { zeroAddress } from 'viem'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { CHAIN_ID_TO_PORTALS_NETWORK } from 'lib/portals/constants'
import type { GetTokensResponse, HistoryResponse } from 'lib/portals/types'
import { assertUnreachable, getTimeFrameBounds, isToken } from 'lib/utils'

import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import { isValidDate } from '../utils/isValidDate'

const calculatePercentChange = (openPrice: string, closePrice: string): number => {
  const open = bnOrZero(openPrice)
  const close = bnOrZero(closePrice)
  if (open.isZero()) return 0
  return close.minus(open).dividedBy(open).times(100).toNumber()
}

const { throttle, clear } = createThrottle({
  // in theory, 500 rpm as per https://github.com/shapeshift/web/pull/7401#discussion_r1687499650
  // in practice, we get rate limited way before that
  capacity: 50,
  costPerReq: 1,
  drainPerInterval: 50,
  intervalMs: 60_000, // 1mn
})

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

const PORTALS_API_KEY = getConfig().REACT_APP_PORTALS_API_KEY

export class PortalsMarketService implements MarketService {
  baseUrl = getConfig().REACT_APP_PORTALS_BASE_URL

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 250,
  }

  async findAll(args?: FindAllMarketArgs): Promise<MarketCapResult> {
    const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
    const { count } = argsToUse
    const tokensUrl = `${this.baseUrl}/v2/tokens`

    const marketCapResult: MarketCapResult = {}

    try {
      await Promise.all(
        Object.entries(CHAIN_ID_TO_PORTALS_NETWORK).map(async ([chainId, network]) => {
          if (Object.keys(marketCapResult).length >= count) return
          await throttle()

          const params = {
            limit: Math.min(this.defaultGetByMarketCapArgs.count, argsToUse.count),
            minLiquidity: '100000',
            sortBy: 'volumeUsd7d',
            networks: [network],
            // Only fetch a single page for each chain, to avoid Avalanche/Ethereum assets eating all the 1000 count passed by web
            page: '0',
          }

          const { data } = await axios.get<GetTokensResponse>(tokensUrl, {
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            headers: {
              Authorization: `Bearer ${PORTALS_API_KEY}`,
            },
            params,
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
    } finally {
      clear()
    }
  }
  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      const { chainId, assetReference } = fromAssetId(assetId)

      const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]
      if (!network) {
        console.error(`Unsupported chainId: ${chainId}`)
        return null
      }

      const id = `${network}:${isToken(assetId) ? assetReference : zeroAddress}`
      const url = `${this.baseUrl}/v2/tokens/history`
      const params = {
        id,
        from: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
        resolution: '1d',
        page: 0,
      }

      await throttle()
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
    const { chainId, assetReference } = fromAssetId(assetId)
    const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

    if (!network) {
      console.error(`Unsupported chainId: ${chainId}`)
      return []
    }

    const id = `${network}:${isToken(assetId) ? assetReference : zeroAddress}`
    const { start: _start, end } = getTimeFrameBounds(timeframe)

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
        timeframe === HistoryTimeframe.ALL ? dayjs().startOf('minute').subtract(1, 'year') : _start
      const from = Math.floor(start.valueOf() / 1000)
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
